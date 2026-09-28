import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const STOREFRONT_SHARED_SECRET = process.env.STOREFRONT_SHARED_SECRET

/** A beacon is a few hundred bytes. */
const MAX_BODY_BYTES = 2048

/**
 * Short on purpose: nobody waits on this answer (the browser sends beacons and
 * never reads them), and a slow backend should not keep the function open.
 */
const BACKEND_TIMEOUT_MS = 2500

/** Always the same empty answer, whatever happened to the beacon. */
const done = () => new NextResponse(null, { status: 204 })

const hostOf = (value: string | null) => {
  if (!value) {
    return null
  }
  try {
    return new URL(value).host.replace(/^www\./, "")
  } catch {
    return null
  }
}

/** Vercel URL-encodes the city (`San%20Pedro%20Sula`). */
const cityOf = (value: string | null) => {
  if (!value) {
    return undefined
  }
  try {
    return decodeURIComponent(value).slice(0, 120)
  } catch {
    return undefined
  }
}

/**
 * Relays visitor beacons (see `lib/analytics/visitor-events.ts`) to the
 * backend, adding what only the server sees: the user agent, Vercel's
 * geolocation, and whether the visitor has a cart or is logged in (just the
 * yes/no, never the ids).
 *
 * It goes through here rather than straight from the browser because the
 * backend is never called from the browser, and because Vercel's geolocation
 * headers only exist on this side. Identified with the shared secret, like
 * every other storefront call, and with the visitor's address so the backend
 * rate limiter counts them against the visitor rather than against Vercel.
 */
export async function POST(req: NextRequest) {
  // Beacons from another site are not visits to this one.
  const origin = req.headers.get("origin")
  const ownHost = req.nextUrl.host.replace(/^www\./, "")
  if (origin && hostOf(origin) !== ownHost) {
    return done()
  }

  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) {
    return done()
  }

  let beacon: Record<string, unknown>
  try {
    beacon = JSON.parse(text)
  } catch {
    return done()
  }
  if (!beacon || typeof beacon !== "object") {
    return done()
  }

  // A referrer from this same shop is just navigation, not where the visit
  // came from.
  const referrer = typeof beacon.ref === "string" ? beacon.ref : undefined
  const external = referrer && hostOf(referrer) !== ownHost ? referrer : undefined

  const payload = {
    type: beacon.type,
    vid: beacon.vid,
    sid: beacon.sid,
    path: beacon.path,
    ref: external,
    utm: beacon.utm,
    clid: beacon.clid,
    nv: beacon.nv === true,
    ua: req.headers.get("user-agent")?.slice(0, 512) ?? undefined,
    cc: req.headers.get("x-vercel-ip-country") ?? undefined,
    city: cityOf(req.headers.get("x-vercel-ip-city")),
    cart: Boolean(req.cookies.get("_medusa_cart_id")?.value),
    auth: Boolean(req.cookies.get("_medusa_jwt")?.value),
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY
  }
  if (STOREFRONT_SHARED_SECRET) {
    headers["x-storefront-secret"] = STOREFRONT_SHARED_SECRET

    const realClientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    if (realClientIp) {
      headers["x-real-client-ip"] = realClientIp
    }
  }

  try {
    await fetch(`${BACKEND_URL}/store/analytics/events`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    })
  } catch {
    // A lost beacon is a slightly lower number on a dashboard. Nothing to do.
  }

  return done()
}
