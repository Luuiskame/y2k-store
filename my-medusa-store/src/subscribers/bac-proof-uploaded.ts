import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type EventData = {
  order_id: string
  proof_files?: { url: string; uploaded_at: string }[]
}

/** At most one proof notification per order inside this window. */
const NOTIFY_DEDUPE_SECONDS = 60 * 60

/**
 * Ceiling on proof-related emails per day, kept well below the Resend plan's
 * daily quota so order confirmations and password resets always have headroom.
 */
const DAILY_PROOF_EMAIL_BUDGET = 40

/** Budget counters are keyed by UTC date; two days of TTL covers the rollover. */
const BUDGET_TTL_SECONDS = 60 * 60 * 48

export default async function bacProofUploadedHandler({
  event,
  container,
}: SubscriberArgs<EventData>) {
  const orderId = event.data.order_id
  const proofUrls = (event.data.proof_files ?? []).map((p) => p.url)

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notification = container.resolve(Modules.NOTIFICATION)
  const cache = container.resolve(Modules.CACHE)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "status",
      "currency_code",
      "total",
      "shipping_address.first_name",
      "shipping_address.last_name",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0]
  if (!order) {
    logger.warn(`bac-proof-uploaded: order ${orderId} not found`)
    return
  }

  // A canceled order has nothing left to verify, so a receipt on it is either
  // a mistake or abuse. Either way it is not worth an email.
  if (order.status === "canceled") {
    logger.info(
      `bac-proof-uploaded: skipping notifications for canceled order ${orderId}`
    )
    return
  }

  // One notification per order per window, however many receipts arrive.
  // Without this, each upload sent two emails (customer + owner), so a single
  // flooded order drained the whole daily Resend allowance and took real
  // order confirmations and password resets down with it.
  const dedupeKey = `bac-proof-notified:${orderId}`
  try {
    if (await cache.get(dedupeKey)) {
      logger.info(
        `bac-proof-uploaded: already notified for order ${orderId} within the last ${
          NOTIFY_DEDUPE_SECONDS / 60
        } min, skipping`
      )
      return
    }
  } catch {
    // Cache unavailable: fall through and send. The budget check below is the
    // remaining guard.
  }

  // Account-wide circuit breaker. Proof emails are capped well under the
  // Resend daily quota so the transactional mail customers actually depend on
  // keeps working even if this path is abused again.
  const budgetKey = `bac-proof-email-budget:${new Date()
    .toISOString()
    .slice(0, 10)}`
  let sentToday = 0
  try {
    sentToday = (await cache.get<number>(budgetKey)) ?? 0
  } catch {
    // Treat an unreadable counter as zero rather than blocking mail entirely.
  }

  if (sentToday >= DAILY_PROOF_EMAIL_BUDGET) {
    logger.error(
      `bac-proof-uploaded: daily proof-email budget (${DAILY_PROOF_EMAIL_BUDGET}) exhausted, skipping notifications for order ${orderId}`
    )
    return
  }

  const firstName = order.shipping_address?.first_name ?? undefined
  const lastName = order.shipping_address?.last_name ?? undefined
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || undefined

  const totalLabel = formatCurrency(order.total, order.currency_code)

  const ownerEmail = process.env.STORE_OWNER_EMAIL
  const adminBaseUrl =
    process.env.MEDUSA_ADMIN_URL ??
    process.env.MEDUSA_BACKEND_URL ??
    "http://localhost:9000"
  const adminUrl = `${adminBaseUrl.replace(/\/$/, "")}/app/orders/${orderId}`

  const notifications: any[] = []

  if (order.email) {
    notifications.push({
      to: order.email,
      channel: "email",
      template: "bac-proof-received-customer",
      data: {
        first_name: firstName,
        order_display_id: order.display_id,
        total_label: totalLabel,
      },
    })
  }

  if (ownerEmail) {
    notifications.push({
      to: ownerEmail,
      channel: "email",
      template: "bac-proof-received-owner",
      data: {
        order_id: orderId,
        order_display_id: order.display_id,
        customer_name: fullName,
        customer_email: order.email,
        total_label: totalLabel,
        admin_url: adminUrl,
        proof_urls: proofUrls,
      },
    })
  }

  if (notifications.length === 0) {
    return
  }

  try {
    await notification.createNotifications(notifications)
  } catch (err) {
    logger.error(
      `bac-proof-uploaded: failed to send notifications for order ${orderId}: ${err}`
    )
    return
  }

  // Only charge the budget and arm the dedupe once mail actually went out, so
  // a Resend outage does not silently suppress the retry.
  try {
    await cache.set(dedupeKey, true, NOTIFY_DEDUPE_SECONDS)
    await cache.set(
      budgetKey,
      sentToday + notifications.length,
      BUDGET_TTL_SECONDS
    )
  } catch (err) {
    logger.warn(`bac-proof-uploaded: could not record email budget: ${err}`)
  }
}

export const config: SubscriberConfig = {
  event: "bac_transfer.proof_uploaded",
}

function formatCurrency(amount?: number, currencyCode?: string): string | undefined {
  if (amount == null) return undefined
  try {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: (currencyCode ?? "hnl").toUpperCase(),
    }).format(amount)
  } catch {
    return `${amount} ${currencyCode ?? ""}`.trim()
  }
}
