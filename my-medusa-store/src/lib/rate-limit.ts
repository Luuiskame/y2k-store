import { MedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import crypto from "crypto"
import net from "net"

/**
 * Fixed-window counter on top of the Cache Module — Redis-backed in production
 * (so the limit holds across every server instance) and in-memory in dev.
 *
 * A fixed window lets through at most 2x the limit across a window boundary.
 * That is fine here: these limits guard against floods of hundreds of
 * requests, not against a caller squeezing out a few extra.
 */
export type RateLimitResult = {
  allowed: boolean
  remaining: number
  /** Seconds the caller should wait before retrying. */
  retryAfter: number
}

/**
 * A cache call that never comes back is a cache failure, and has to be treated
 * as one. ioredis queues commands while it reconnects instead of rejecting, so
 * a Redis outage does not surface as an error for a long time — measured at 84s
 * per call against a killed instance. Every `/store/*` and `/auth/*` request
 * goes through here, so without a deadline a Redis blip would hang the entire
 * shop rather than letting it through unprotected.
 *
 * Generous next to a healthy Redis round trip (single-digit ms on Railway's
 * internal network) and short enough to be invisible if it ever fires.
 */
const CACHE_TIMEOUT_MS = 250

const withDeadline = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`cache call exceeded ${ms}ms`)),
      ms
    )

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

export const consumeRateLimit = async (
  req: MedusaRequest,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> => {
  const cache = req.scope.resolve(Modules.CACHE)

  const window = Math.floor(Date.now() / (windowSeconds * 1000))
  const cacheKey = `ratelimit:${key}:${window}`

  let count = 0
  try {
    count =
      (await withDeadline(
        Promise.resolve(cache.get<number>(cacheKey)),
        CACHE_TIMEOUT_MS
      )) ?? 0
  } catch {
    // A cache outage must not take checkout down with it. Fail open here — the
    // per-order caps in the route are authoritative and read from the database.
    return { allowed: true, remaining: limit, retryAfter: 0 }
  }

  if (count >= limit) {
    const elapsed = Date.now() - window * windowSeconds * 1000
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(windowSeconds - elapsed / 1000)),
    }
  }

  try {
    await withDeadline(
      Promise.resolve(cache.set(cacheKey, count + 1, windowSeconds)),
      CACHE_TIMEOUT_MS
    )
  } catch {
    // Same reasoning as above.
  }

  return { allowed: true, remaining: limit - count - 1, retryAfter: 0 }
}

/* -------------------------------------------------------------------------- */
/*  Who is the caller?                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The storefront never talks to this API from the browser: `MEDUSA_BACKEND_URL`
 * has no `NEXT_PUBLIC_` prefix and every `src/lib/data/*.ts` is a server
 * action, so 100% of legitimate store traffic arrives from a handful of Vercel
 * egress addresses. Bucketing that traffic by the address we see would put the
 * whole shop in one bucket and take it down.
 *
 * So the storefront identifies itself with `x-storefront-secret` and passes the
 * visitor's own address in `x-real-client-ip`. Requests that cannot prove they
 * are the storefront are bucketed by the address the edge reports, which is the
 * one an attacker hitting the API directly does not get to choose.
 */
export type ClientIdentity = {
  /** Value to bucket this request under. Never empty. */
  ip: string
  /** The caller proved it is the storefront. */
  internal: boolean
  /** We are bucketing by the visitor's own address, not by an egress address. */
  realIp: boolean
}

const headerValue = (req: MedusaRequest, name: string): string | undefined => {
  const raw = req.headers[name]
  return Array.isArray(raw) ? raw[0] : raw
}

/**
 * `x-forwarded-for` can arrive as repeated headers, which Node exposes either
 * joined or as an array. Flatten so the hop arithmetic below sees one list
 * either way.
 */
const forwardedForList = (req: MedusaRequest): string[] => {
  const raw = req.headers["x-forwarded-for"]
  const joined = Array.isArray(raw) ? raw.join(",") : raw

  return (joined ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/**
 * Whatever comes out of here ends up inside a Redis key, so only hand back
 * something that is genuinely an address.
 */
const normalizeIp = (value: string | undefined | null): string | null => {
  if (!value) {
    return null
  }

  let candidate = value.trim()
  if (!candidate) {
    return null
  }

  // `[2001:db8::1]:443` — bracketed IPv6, with an optional port.
  const bracketed = candidate.match(/^\[(.+)\](?::\d+)?$/)
  if (bracketed) {
    candidate = bracketed[1]
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    // `203.0.113.7:54321` — some proxies append the source port to IPv4.
    candidate = candidate.slice(0, candidate.lastIndexOf(":"))
  }

  return net.isIP(candidate) ? candidate : null
}

/**
 * How many proxies sit between us and the client, i.e. how many entries the
 * edge appends to `x-forwarded-for`. Default 1 = the rightmost entry, which on
 * Railway today is the only one and is written by the edge itself.
 */
const trustedProxyHops = (): number => {
  const parsed = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

/**
 * True when the caller presented the shared secret the storefront is deployed
 * with. Never throws: a missing or malformed secret just means "not internal".
 *
 * The SHA-256 digests are compared rather than the raw values so
 * `timingSafeEqual` always receives two 32-byte buffers. It throws on a length
 * mismatch, and length-guarding the raw values would leak the secret's length.
 */
export const isInternalRequest = (req: MedusaRequest): boolean => {
  const expected = process.env.STOREFRONT_SHARED_SECRET

  // Deliberate fail-open on configuration: with no secret set, storefront
  // traffic is simply treated as external (see the limits in middlewares.ts).
  // A missing environment variable must never be able to take the shop down.
  if (!expected) {
    return false
  }

  const provided = headerValue(req, "x-storefront-secret")
  if (!provided) {
    return false
  }

  try {
    return crypto.timingSafeEqual(
      crypto.createHash("sha256").update(provided).digest(),
      crypto.createHash("sha256").update(expected).digest()
    )
  } catch {
    return false
  }
}

/**
 * Resolves the address this request should be bucketed under, and how much we
 * trust it.
 *
 * Precedence:
 *   1. `x-real-client-ip`, but only from a caller that proved it is the
 *      storefront. Without that proof the header is ignored outright — it must
 *      not be usable to mint a fresh bucket per request.
 *   2. `cf-connecting-ip`, when `CLIENT_IP_SOURCE=cf`.
 *   3. `x-forwarded-for`, taking the entry `TRUSTED_PROXY_HOPS` from the RIGHT.
 *      Never the leftmost one: that end of the list is written by the client.
 *   4. The socket address.
 *
 * >>> The day the API moves behind Cloudflare, set `CLIENT_IP_SOURCE=cf` on the
 * >>> Railway server and worker services. Cloudflare *appends* to
 * >>> `x-forwarded-for` instead of overwriting it, so without that flag the hop
 * >>> arithmetic in step 3 starts counting over a list the client can pad, and
 * >>> the limiter becomes evadable. `cf-connecting-ip` is written by Cloudflare
 * >>> itself and cannot be spoofed through it.
 */
export const identifyClient = (req: MedusaRequest): ClientIdentity => {
  const internal = isInternalRequest(req)

  if (internal) {
    const real = normalizeIp(headerValue(req, "x-real-client-ip"))
    if (real) {
      return { ip: real, internal, realIp: true }
    }
  }

  const fromEdge = (): string | null => {
    if (process.env.CLIENT_IP_SOURCE === "cf") {
      // Intentionally does NOT fall back to x-forwarded-for: behind Cloudflare
      // that list is client-paddable, so guessing from it would be worse than
      // sharing the socket bucket.
      return normalizeIp(headerValue(req, "cf-connecting-ip"))
    }

    const entries = forwardedForList(req)
    if (!entries.length) {
      return null
    }

    const index = Math.max(0, entries.length - trustedProxyHops())
    return normalizeIp(entries[index])
  }

  const ip = fromEdge() ?? normalizeIp(req.socket?.remoteAddress) ?? "unknown"

  return { ip, internal, realIp: false }
}

/**
 * Best-effort client IP. Behind Railway/Cloudflare the socket address is the
 * proxy's, so prefer the forwarding headers and fall back to the socket.
 */
export const clientIp = (req: MedusaRequest): string => identifyClient(req).ip

/* -------------------------------------------------------------------------- */
/*  Limits for the global throttles                                           */
/* -------------------------------------------------------------------------- */

/** Window shared by the `/store/*` and `/auth/*` throttles, in seconds. */
export const GLOBAL_WINDOW_SECONDS = 60

export type GlobalLimit = {
  /** Storefront traffic bucketed by the visitor's own address. */
  internal: number
  /**
   * Storefront traffic we could not resolve a visitor address for, so the whole
   * shop shares one bucket. A safety net against a runaway loop, not a security
   * control — it has to sit well above real peak traffic.
   */
  internalShared: number
  /** Anything that did not prove it is the storefront. This is the attack path. */
  external: number
}

export const STORE_LIMIT: GlobalLimit = {
  internal: 120,
  internalShared: 1200,
  external: 60,
}

export const AUTH_LIMIT: GlobalLimit = {
  internal: 10,
  internalShared: 100,
  external: 10,
}

export const limitFor = (
  limit: GlobalLimit,
  identity: ClientIdentity
): number => {
  if (!identity.internal) {
    return limit.external
  }

  return identity.realIp ? limit.internal : limit.internalShared
}
