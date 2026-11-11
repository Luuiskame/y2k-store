import { createHash } from "crypto"

import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateUsersWorkflow } from "@medusajs/medusa/core-flows"
import { sendNotification } from "web-push"

/**
 * Push alerts for the people who run the store: a new order, a BAC transfer
 * receipt. They reach every device where someone tapped "Activar alertas" in
 * the admin, the iPhone Home Screen app included (iOS 16.4+), so a sale is
 * heard about without watching an inbox.
 *
 * Each admin user keeps their own devices in their user metadata under
 * `push_subscriptions`: there is no table to migrate, and removing an admin
 * user removes their devices with them.
 *
 * Needs a VAPID key pair (generate it once: `npx web-push
 * generate-vapid-keys`) and a contact for the push services, on BOTH Railway
 * services: the server hands the public key to the browser and sends test
 * alerts, the worker sends the real ones. A subscription only accepts messages
 * signed with the key it was created with, which is why every device records
 * the key it subscribed to (`vapid_key`).
 */

export const PUSH_METADATA_KEY = "push_subscriptions"

export const NOT_CONFIGURED_MESSAGE =
  "Las alertas no están configuradas en el servidor: faltan las variables WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY y WEB_PUSH_SUBJECT."

/** Devices kept per admin user; the one silent the longest goes first. */
export const MAX_DEVICES_PER_USER = 10

/**
 * How long a push service holds an alert for a phone that is off or offline.
 * A day: yesterday's order is still worth hearing about, last week's is better
 * found in the admin.
 */
export const ALERT_TTL_SECONDS = 60 * 60 * 24

/** Per-request ceiling, so one slow push service cannot hold up the rest. */
const SEND_TIMEOUT_MS = 10_000

/**
 * The push services of the browsers that can run the admin. The browser picks
 * the endpoint and the server POSTs to it, so an admin session must not be
 * able to point the server at any other URL.
 */
const PUSH_SERVICE_HOSTS = [
  "push.apple.com", // Safari, and every browser on iPhone and iPad
  "googleapis.com", // Chrome, Android, Opera, Samsung Internet
  "mozilla.com", // Firefox
  "notify.windows.com", // Edge
]

export type StoredPushSubscription = {
  /** Short, stable handle for the endpoint; it is what URLs carry. */
  id: string
  endpoint: string
  keys: { p256dh: string; auth: string }
  /** "iPhone", "Windows · Chrome"… so the admin can tell devices apart. */
  device: string
  /** The VAPID public key this device subscribed with. */
  vapid_key: string
  created_at: string
}

export type NewPushSubscription = Omit<StoredPushSubscription, "id" | "created_at">

/** What the admin is shown about a device; never the encryption keys. */
export type PushDevice = {
  id: string
  endpoint: string
  device: string
  created_at: string
  /** False once the server's key changed: the device has to subscribe again. */
  current_key: boolean
}

export type AdminAlert = {
  title: string
  body: string
  /** Admin page to open, relative to the dashboard root (`orders/order_…`). */
  url: string
  /** Alerts sharing a tag replace each other on the device instead of piling up. */
  tag?: string
}

export type VapidConfig = {
  subject: string
  publicKey: string
  privateKey: string
}

export type AlertDelivery = {
  sent: number
  /** Devices their push service no longer knows (app removed, alerts turned off): dropped. */
  removed: number
  failed: number
  /** Devices subscribed with another VAPID key, which could not have accepted the alert. */
  skipped: number
}

export type OrderAlertDetails = {
  id: string
  display_id?: number | null
  status?: string | null
  currency_code?: string | null
  /** A number or one of Medusa's BigNumbers; anything else is left out. */
  total?: unknown
  customer_name?: string | null
  city?: string | null
  item_count?: number
}

export const getVapidConfig = (
  env: NodeJS.ProcessEnv = process.env
): VapidConfig | null => {
  const publicKey = env.WEB_PUSH_PUBLIC_KEY?.trim()
  const privateKey = env.WEB_PUSH_PRIVATE_KEY?.trim()
  const ownerEmail = env.STORE_OWNER_EMAIL?.trim()
  // Apple's push service refuses messages whose VAPID subject is not a real
  // contact (`mailto:` or `https:`); the owner's address is one.
  const subject =
    env.WEB_PUSH_SUBJECT?.trim() || (ownerEmail ? `mailto:${ownerEmail}` : "")

  if (!publicKey || !privateKey || !subject) {
    return null
  }

  return { subject, publicKey, privateKey }
}

export const subscriptionId = (endpoint: string): string =>
  createHash("sha256").update(endpoint).digest("hex").slice(0, 16)

export const isAllowedPushEndpoint = (endpoint: string): boolean => {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }

  if (url.protocol !== "https:") {
    return false
  }

  const host = url.hostname.toLowerCase()
  return PUSH_SERVICE_HOSTS.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  )
}

/** The devices stored in a user's metadata, skipping anything malformed. */
export const readStoredSubscriptions = (
  metadata: Record<string, unknown> | null | undefined
): StoredPushSubscription[] => {
  const raw = metadata?.[PUSH_METADATA_KEY]
  if (!Array.isArray(raw)) {
    return []
  }

  const devices: StoredPushSubscription[] = []
  for (const entry of raw) {
    const value = entry as Partial<StoredPushSubscription> | null
    if (
      !value ||
      typeof value.endpoint !== "string" ||
      typeof value.keys?.p256dh !== "string" ||
      typeof value.keys?.auth !== "string"
    ) {
      continue
    }

    devices.push({
      id: subscriptionId(value.endpoint),
      endpoint: value.endpoint,
      keys: { p256dh: value.keys.p256dh, auth: value.keys.auth },
      device: typeof value.device === "string" ? value.device : "Dispositivo",
      vapid_key: typeof value.vapid_key === "string" ? value.vapid_key : "",
      created_at:
        typeof value.created_at === "string" ? value.created_at : "",
    })
  }
  return devices
}

/**
 * Adds a device, or refreshes it when the endpoint is already known. The
 * device that just checked in moves to the end, so the cap drops the one that
 * has been silent the longest.
 */
export const upsertSubscription = (
  devices: StoredPushSubscription[],
  input: NewPushSubscription,
  now: Date = new Date()
): StoredPushSubscription[] => {
  const id = subscriptionId(input.endpoint)
  const previous = devices.find((device) => device.id === id)

  const entry: StoredPushSubscription = {
    id,
    endpoint: input.endpoint,
    keys: { p256dh: input.keys.p256dh, auth: input.keys.auth },
    device: input.device,
    vapid_key: input.vapid_key,
    created_at: previous?.created_at || now.toISOString(),
  }

  return [...devices.filter((device) => device.id !== id), entry].slice(
    -MAX_DEVICES_PER_USER
  )
}

export const toPushDevice = (
  subscription: StoredPushSubscription,
  vapid: VapidConfig | null
): PushDevice => ({
  id: subscription.id,
  endpoint: subscription.endpoint,
  device: subscription.device,
  created_at: subscription.created_at,
  current_key: !!vapid && subscription.vapid_key === vapid.publicKey,
})

/** A label for the device a request came from, from its user agent. */
export const describeDevice = (userAgent: string | undefined): string => {
  const ua = userAgent ?? ""

  // Every browser on iPhone and iPad is Safari underneath, and the Home Screen
  // app is what gets the alerts there: the device is the useful part.
  if (/iPhone/.test(ua)) {
    return "iPhone"
  }
  if (/iPad/.test(ua)) {
    return "iPad"
  }

  const system = /Android/.test(ua)
    ? "Android"
    : /Windows/.test(ua)
      ? "Windows"
      : /CrOS/.test(ua)
        ? "ChromeOS"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : ""

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser\//.test(ua)
        ? "Samsung Internet"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : ""

  return [system, browser].filter(Boolean).join(" · ") || "Dispositivo"
}

const formatAmount = (
  amount: unknown,
  currencyCode?: string | null
): string | undefined => {
  if (amount === null || amount === undefined) {
    return undefined
  }

  const value = Number(amount)
  if (!Number.isFinite(value)) {
    return undefined
  }

  const currency = (currencyCode || "hnl").toUpperCase()
  try {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

const orderNumber = (order: OrderAlertDetails): string =>
  order.display_id ? `#${order.display_id}` : ""

export const newOrderAlert = (order: OrderAlertDetails): AdminAlert => {
  const amount = formatAmount(order.total, order.currency_code)
  const items = order.item_count
    ? `${order.item_count} ${order.item_count === 1 ? "artículo" : "artículos"}`
    : ""

  return {
    title:
      ["Nuevo pedido", orderNumber(order)].filter(Boolean).join(" ") +
      (amount ? ` · ${amount}` : ""),
    body:
      [order.customer_name, order.city, items].filter(Boolean).join(" · ") ||
      "Ábrelo para ver el detalle.",
    url: `orders/${order.id}`,
    tag: `order-${order.id}`,
  }
}

export const proofReceivedAlert = (
  order: OrderAlertDetails,
  fileCount: number
): AdminAlert => {
  const amount = formatAmount(order.total, order.currency_code)
  const number = orderNumber(order)
  const files = fileCount > 1 ? ` (${fileCount} archivos)` : ""

  return {
    title: number
      ? `Comprobante recibido · pedido ${number}`
      : "Comprobante recibido",
    body: `${order.customer_name || "El cliente"} subió el comprobante${files}${
      amount ? ` de ${amount}` : ""
    }. Revísalo y confirma el pago.`,
    url: `orders/${order.id}`,
    tag: `proof-${order.id}`,
  }
}

export const testAlert = (): AdminAlert => ({
  title: "Alertas de ventas activas",
  body: "Así te vamos a avisar de cada pedido nuevo y de cada comprobante de transferencia.",
  url: "orders",
  tag: "test",
})

type UserRow = { id: string; metadata?: Record<string, unknown> | null }

const loadUsers = async (
  container: MedusaContainer,
  userIds?: string[]
): Promise<UserRow[]> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "metadata"],
    filters: userIds ? { id: userIds } : {},
  })
  return (data ?? []) as UserRow[]
}

/** The devices of one admin user. */
export const listUserDevices = async (
  container: MedusaContainer,
  userId: string
): Promise<StoredPushSubscription[]> => {
  const [user] = await loadUsers(container, [userId])
  return readStoredSubscriptions(user?.metadata)
}

/**
 * Read-modify-write of one user's devices. The lock keeps two devices of the
 * same person, or the worker dropping an expired one, from undoing each
 * other's change; only `push_subscriptions` is written, the rest of the
 * metadata is merged back untouched by Medusa.
 */
export const updateStoredSubscriptions = async (
  container: MedusaContainer,
  userId: string,
  change: (devices: StoredPushSubscription[]) => StoredPushSubscription[]
): Promise<StoredPushSubscription[]> => {
  const locking = container.resolve(Modules.LOCKING)

  return await locking.execute(
    `admin-push:${userId}`,
    async () => {
      const current = await listUserDevices(container, userId)
      const next = change(current)

      if (JSON.stringify(next) === JSON.stringify(current)) {
        return next
      }

      await updateUsersWorkflow(container).run({
        input: {
          updates: [{ id: userId, metadata: { [PUSH_METADATA_KEY]: next } }],
        },
      })
      return next
    },
    { timeout: 5 }
  )
}

const hostOf = (endpoint: string): string => {
  try {
    return new URL(endpoint).host
  } catch {
    return "?"
  }
}

const describeError = (err: unknown): string => {
  const { statusCode, body, message } = (err ?? {}) as {
    statusCode?: number
    body?: unknown
    message?: string
  }
  const detail = String(body || message || err).slice(0, 200)
  return statusCode ? `${statusCode} ${detail}` : detail
}

/**
 * Sends one alert to every device of every admin user, or only of `userIds`.
 * Never throws for a device: a push service that is down only counts as
 * `failed`, and one that says the device is gone (404/410) gets it removed.
 */
export const sendAdminAlert = async (
  container: MedusaContainer,
  alert: AdminAlert,
  { userIds }: { userIds?: string[] } = {}
): Promise<AlertDelivery> => {
  const delivery: AlertDelivery = { sent: 0, removed: 0, failed: 0, skipped: 0 }

  const vapid = getVapidConfig()
  if (!vapid) {
    return delivery
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const users = await loadUsers(container, userIds)
  const payload = JSON.stringify({ ...alert, timestamp: Date.now() })
  const gone = new Map<string, Set<string>>()

  await Promise.all(
    users.flatMap((user) =>
      readStoredSubscriptions(user.metadata).map(async (subscription) => {
        if (subscription.vapid_key !== vapid.publicKey) {
          delivery.skipped++
          return
        }

        try {
          await sendNotification(
            { endpoint: subscription.endpoint, keys: subscription.keys },
            payload,
            {
              vapidDetails: vapid,
              TTL: ALERT_TTL_SECONDS,
              urgency: "high",
              timeout: SEND_TIMEOUT_MS,
            }
          )
          delivery.sent++
        } catch (err) {
          const status = (err as { statusCode?: unknown })?.statusCode
          if (status === 404 || status === 410) {
            const ids = gone.get(user.id) ?? new Set<string>()
            ids.add(subscription.id)
            gone.set(user.id, ids)
            delivery.removed++
            return
          }

          delivery.failed++
          logger.warn(
            `admin-push: ${subscription.device} (${hostOf(
              subscription.endpoint
            )}) did not take the alert: ${describeError(err)}`
          )
        }
      })
    )
  )

  for (const [userId, ids] of gone) {
    try {
      await updateStoredSubscriptions(container, userId, (devices) =>
        devices.filter((device) => !ids.has(device.id))
      )
    } catch (err) {
      logger.warn(
        `admin-push: could not drop ${ids.size} expired device(s) of user ${userId}: ${err}`
      )
    }
  }

  return delivery
}
