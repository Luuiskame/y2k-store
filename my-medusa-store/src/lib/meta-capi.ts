import { createHash } from "crypto"

/**
 * Meta (Facebook) Conversions API — server-side counterpart to the browser
 * Pixel. This is the single source of truth on the backend for how a Medusa
 * order maps onto a Meta server `Purchase` event.
 *
 * Dedup contract: the storefront pixel stamps `eventID = order.id` on its
 * browser Purchase (see meta-events.ts / meta-pixel.tsx). This module stamps
 * the same value as `event_id`, so Meta collapses the browser + server events
 * into one. content_ids / value / currency are kept in sync with the
 * storefront's meta-events.ts so both events reference identical catalog items.
 *
 * Config (env):
 *   META_PIXEL_ID            - pixel/dataset id (falls back to NEXT_PUBLIC_META_PIXEL_ID)
 *   META_CAPI_ACCESS_TOKEN   - System User token with ads_management / the pixel
 *   META_CAPI_TEST_EVENT_CODE- optional; routes events to Events Manager > Test Events
 *   META_GRAPH_API_VERSION   - optional; defaults to v21.0
 *   META_EVENT_SOURCE_URL    - optional; the storefront URL for website events
 */

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || "v21.0"

// The backend reuses the same pixel id the browser pixel initializes with.
const PIXEL_ID =
  process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE
const EVENT_SOURCE_URL = process.env.META_EVENT_SOURCE_URL

/** True only when both the pixel id and an access token are present. */
export function isMetaCapiConfigured(): boolean {
  return Boolean(PIXEL_ID && ACCESS_TOKEN)
}

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex")

// Meta requires user-data fields to be normalized, then SHA-256 hashed.
const hashNormalized = (
  value: string | null | undefined,
  normalize: (v: string) => string
): string | undefined => {
  if (value == null) return undefined
  const normalized = normalize(String(value))
  if (!normalized) return undefined
  return sha256(normalized)
}

const lower = (v: string) => v.trim().toLowerCase()
const stripSpaces = (v: string) => lower(v).replace(/\s+/g, "")

// HN mobile numbers are 8 digits; Meta wants the country code included.
const normalizePhone = (v: string) => {
  const digits = v.replace(/\D/g, "")
  if (!digits) return ""
  return digits.length === 8 ? `504${digits}` : digits
}

type MetaUserData = Record<string, string>

// Meta expects an uppercase ISO-4217 currency; Medusa stores it lowercase.
const toCurrency = (code?: string | null) => (code ?? "hnl").toUpperCase()

// Mirrors lineItemContentId() in the storefront's meta-events.ts. Order line
// items snapshot the SKU as `variant_sku`; cart line items expose it as
// `variant.sku`, so both resolve to the same id.
const lineItemContentId = (item: any): string =>
  item?.variant_sku ?? item?.variant_id ?? item?.product_id ?? ""

/** Hashed customer PII used by Meta to match the event to a person. */
export function buildPurchaseUserData(order: any): MetaUserData {
  const addr = order?.shipping_address ?? {}
  const data: MetaUserData = {}

  const set = (key: string, hash?: string) => {
    if (hash) data[key] = hash
  }

  set("em", hashNormalized(order?.email, lower))
  set("ph", hashNormalized(addr.phone, normalizePhone))
  set("fn", hashNormalized(addr.first_name, lower))
  set("ln", hashNormalized(addr.last_name, lower))
  set("ct", hashNormalized(addr.city, stripSpaces))
  set("st", hashNormalized(addr.province, stripSpaces))
  set("zp", hashNormalized(addr.postal_code, stripSpaces))
  set("country", hashNormalized(addr.country_code, lower))
  set("external_id", hashNormalized(order?.customer_id, (v) => v.trim()))

  return data
}

/** Builds the server-side `Purchase` event for a placed order. */
export function buildPurchaseEvent(order: any) {
  const items: any[] = order?.items ?? []

  return {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    // Shared with the browser pixel (meta-events.ts stamps eventID = order.id)
    // so Meta dedupes the two Purchase events into one conversion.
    event_id: order.id,
    action_source: "website" as const,
    ...(EVENT_SOURCE_URL ? { event_source_url: EVENT_SOURCE_URL } : {}),
    user_data: buildPurchaseUserData(order),
    custom_data: {
      currency: toCurrency(order?.currency_code),
      value: order?.total ?? 0,
      content_type: "product",
      content_ids: items.map(lineItemContentId),
      contents: items.map((i) => ({
        id: lineItemContentId(i),
        quantity: i.quantity,
      })),
      num_items: items.reduce(
        (sum: number, i: any) => sum + (i.quantity ?? 0),
        0
      ),
    },
  }
}

/**
 * POSTs events to the Meta Conversions API. Resolves with the HTTP outcome so
 * the caller can log rejections; throws only on network/config failure.
 */
export async function sendMetaConversionEvents(
  events: object[]
): Promise<{ ok: boolean; status: number; body: string }> {
  if (!isMetaCapiConfigured()) {
    throw new Error("Meta Conversions API is not configured")
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`

  const payload: Record<string, unknown> = { data: events }
  if (TEST_EVENT_CODE) {
    payload.test_event_code = TEST_EVENT_CODE
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const body = await res.text()
    return { ok: res.ok, status: res.status, body }
  } finally {
    clearTimeout(timeout)
  }
}
