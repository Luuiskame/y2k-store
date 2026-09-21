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

/**
 * Failing open is the right call, but doing it silently means a limiter that has
 * stopped counting looks exactly like a limiter nobody is testing. During a
 * Redis outage every single request takes this path, so the line itself is
 * throttled — one every 10s is plenty to spot it in the Railway logs.
 */
let lastFailOpenLog = 0

const logFailOpen = (stage: string, key: string, error: unknown): void => {
  const now = Date.now()
  if (now - lastFailOpenLog < 10_000) {
    return
  }
  lastFailOpenLog = now

  const reason = error instanceof Error ? error.message : String(error)
  console.warn(
    `[rate-limit] cache ${stage} failed for "${key}" — request served without being counted: ${reason}`
  )
}

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
  } catch (error) {
    // A cache outage must not take checkout down with it. Fail open here — the
    // per-order caps in the route are authoritative and read from the database.
    logFailOpen("read", cacheKey, error)
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
  } catch (error) {
    // Same reasoning as above.
    logFailOpen("write", cacheKey, error)
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
  /** The address we resolved for this caller. Never empty. */
  ip: string
  /**
   * Value to bucket this request under: `ip`, collapsed to a /64 when it is
   * IPv6. Always use this for the cache key, never `ip`.
   */
  bucket: string
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
 *
 * IPv4-mapped IPv6 (`::ffff:203.0.113.7`) collapses to plain IPv4. Node reports
 * that form from `socket.remoteAddress` on a dual-stack listener while an edge
 * writes the plain form into `x-forwarded-for`, so without this one caller lands
 * in two different buckets depending on which source we happened to read.
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

  // `fe80::1%eth0` — the zone index is meaningful only on the host that wrote it.
  const zone = candidate.indexOf("%")
  if (zone !== -1) {
    candidate = candidate.slice(0, zone)
  }

  if (!net.isIP(candidate)) {
    return null
  }

  const mapped = candidate.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)
  return mapped && net.isIPv4(mapped[1]) ? mapped[1] : candidate
}

/**
 * Addresses that belong to the plumbing rather than to a visitor: loopback, the
 * RFC1918 blocks, link-local, carrier-grade NAT, IPv6 unique-local. An edge or
 * an internal hop writes these into `x-forwarded-for`; a caller arriving over
 * the public internet never does.
 */
const isInfrastructureIp = (ip: string): boolean => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10, CGNAT
      (a === 169 && b === 254) || // 169.254.0.0/16, link-local
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) // 198.18.0.0/15, benchmarking
    )
  }

  const lower = ip.toLowerCase()
  if (lower === "::" || lower === "::1") {
    return true
  }

  const head = Number.parseInt(lower.split(":")[0] || "0", 16)
  if (!Number.isInteger(head)) {
    return false
  }

  return (
    (head & 0xfe00) === 0xfc00 || // fc00::/7, unique-local
    (head & 0xffc0) === 0xfe80 // fe80::/10, link-local
  )
}

/**
 * How many entries the trusted edge appends to `x-forwarded-for`, counted from
 * the right. The entry at that position is the address the outermost trusted
 * proxy saw the caller connect from; everything to its right is our own
 * plumbing and everything to its left is client-written and worthless.
 *
 * Two, on Railway. Measured from production logs on 2026-09-21 with
 * `RATE_LIMIT_DEBUG=1`, across ~200 requests from one caller:
 *
 *   xff="206.203.54.52, 152.233.23.193"  socket=::ffff:100.64.0.3
 *   xff="206.203.54.52, 152.233.23.194"  socket=::ffff:100.64.0.7
 *
 * The edge writes the caller's address, an internal hop appends the edge's own
 * address, and the socket we are handed belongs to that internal hop. The list
 * is two entries long on every single request — the hop count does NOT vary,
 * which is what an earlier round of this investigation concluded and got wrong.
 */
const DEFAULT_TRUSTED_PROXY_HOPS = 2

/**
 * Position in `x-forwarded-for` to read the caller from, counted from the right
 * (1 = the rightmost entry). `TRUSTED_PROXY_HOPS` overrides the default for an
 * edge with a different shape.
 */
const trustedProxyHops = (): number => {
  const parsed = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "", 10)
  return Number.isInteger(parsed) && parsed >= 1
    ? parsed
    : DEFAULT_TRUSTED_PROXY_HOPS
}

/**
 * The caller's address out of `x-forwarded-for`.
 *
 * Counted from the RIGHT, never from the left: the left end of the list is
 * written by the client and a caller could pad it to mint a fresh bucket per
 * request. Counting from the right is also stable under that padding — an extra
 * client-supplied entry shifts the whole list, and the position we read shifts
 * with it.
 *
 * This deliberately does NOT try to recognise the caller by skipping entries
 * that look like infrastructure. That was the previous implementation and it is
 * why the limiter stayed broken: Railway's internal hop appends a *publicly
 * routable* address (152.233.23.193 / .194), which no private-range test can
 * tell apart from a visitor. Worse, there are two of them and they alternate
 * per request, so one caller was still being counted in two buckets and the
 * effective limit was still exactly 2x the configured one. Only the deployment
 * knows how many entries its edge adds; it is configuration, not a heuristic.
 */
const clientFromForwardedFor = (req: MedusaRequest): string | null => {
  const entries = forwardedForList(req)
  if (!entries.length) {
    return null
  }

  const parsed = entries.map(normalizeIp)

  // Clamped rather than failed: a request that reached us through fewer hops
  // than configured (an internal probe, a route that skips the edge) still has
  // its leftmost entry written by a proxy we trust.
  const index = Math.max(0, parsed.length - trustedProxyHops())
  if (parsed[index]) {
    return parsed[index]
  }

  // The configured position held something that is not an address. Do not go
  // looking for a substitute: to its left is client-written, to its right is our
  // own plumbing, and both are wrong answers. Returning null hands the request
  // to the socket fallback, which is at least honest about what it is.
  return null
}

/**
 * Expands an IPv6 address to its eight canonical groups, so that `2001:0db8::1`
 * and `2001:db8:0:0:0:0:0:1` cannot end up as two different buckets.
 */
const expandIpv6 = (ip: string): string[] | null => {
  const lower = ip.toLowerCase()
  const short = lower.includes("::")
  const [head, tail = ""] = lower.split("::")

  // A trailing IPv4 literal (`2001:db8::203.0.113.7`) occupies two groups.
  const spread = (groups: string[]): string[] => {
    const last = groups[groups.length - 1]
    if (!last || !net.isIPv4(last)) {
      return groups
    }
    const [a, b, c, d] = last.split(".").map(Number)
    return [
      ...groups.slice(0, -1),
      (((a << 8) | b) >>> 0).toString(16),
      (((c << 8) | d) >>> 0).toString(16),
    ]
  }

  const left = spread(head ? head.split(":").filter(Boolean) : [])
  const right = spread(tail ? tail.split(":").filter(Boolean) : [])

  if (!short) {
    return left.length === 8 ? left.map((g) => Number.parseInt(g, 16).toString(16)) : null
  }

  const fill = 8 - left.length - right.length
  if (fill < 0) {
    return null
  }

  return [...left, ...Array<string>(fill).fill("0"), ...right].map((g) =>
    Number.parseInt(g, 16).toString(16)
  )
}

/**
 * The value a caller is bucketed under.
 *
 * IPv4 buckets as itself. IPv6 buckets by its /64 prefix, because that is the
 * smallest block an ISP hands to a single subscriber: bucketing the full
 * address gives one customer 2^64 buckets, which is the same as no limit at all.
 */
export const bucketForIp = (ip: string): string => {
  if (!net.isIPv6(ip)) {
    return ip
  }

  const groups = expandIpv6(ip)
  return groups ? `${groups.slice(0, 4).join(":")}::/64` : ip
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
 * Bucketing external traffic by an infrastructure address means every caller in
 * the world shares a single counter: the limit stops being per-visitor, and
 * legitimate customers collect 429s that somebody else earned.
 *
 * It is always a misconfiguration — a `TRUSTED_PROXY_HOPS` that does not match
 * the edge, or an edge that stopped sending `x-forwarded-for` and left us on
 * the socket address. It is also invisible from outside, which is how a
 * one-bucket-for-everyone shape survived two rounds of black-box probing on
 * 2026-09-21. Say it out loud, throttled like the fail-open line.
 *
 * It cannot catch the mirror-image mistake — reading an edge address that
 * happens to be publicly routable, which is the other half of what went wrong
 * that day. Nothing in the request can: only the deployment knows how many
 * proxies sit in front of it.
 */
let lastSharedBucketLog = 0

const warnSharedBucket = (identity: ClientIdentity): void => {
  if (identity.internal || !isInfrastructureIp(identity.ip)) {
    return
  }

  const now = Date.now()
  if (now - lastSharedBucketLog < 10_000) {
    return
  }
  lastSharedBucketLog = now

  console.warn(
    `[rate-limit] external traffic is being bucketed by "${identity.bucket}", an infrastructure address — every caller is sharing one counter. Check TRUSTED_PROXY_HOPS against what the edge actually sends (RATE_LIMIT_DEBUG=1).`
  )
}

/**
 * Set `RATE_LIMIT_DEBUG=1` on the Railway service to print, per request, what
 * the edge actually sent and which bucket it resolved to, plus the full set of
 * `x-*` headers once at startup.
 *
 * This is the only way to see the input `identifyClient` works from, and the
 * shape of `x-forwarded-for` on Railway is undocumented: both rounds of the
 * 2026-09-21 investigation guessed at it from response codes alone, and both
 * guessed wrong. Turn it on before theorising, not after. One line per request,
 * so turn it off again once the question is answered.
 */
let dumpedHeaders = false

const debugIdentity = (req: MedusaRequest, identity: ClientIdentity): void => {
  if (process.env.RATE_LIMIT_DEBUG !== "1") {
    return
  }

  // Once per process, the whole forwarding envelope. The per-request line below
  // shows only the two headers we already decided to read, which is no help at
  // all when the question is whether the edge offers something better to read.
  if (!dumpedHeaders) {
    dumpedHeaders = true
    const forwarding = Object.fromEntries(
      Object.entries(req.headers).filter(([name]) => name.startsWith("x-"))
    )
    console.log(
      `[rate-limit] forwarding headers on first request: ${JSON.stringify(
        forwarding
      )}`
    )
  }

  const xff = req.headers["x-forwarded-for"]

  console.log(
    `[rate-limit] xff=${JSON.stringify(xff ?? null)} socket=${
      req.socket?.remoteAddress ?? null
    } internal=${identity.internal} realIp=${identity.realIp} bucket=${
      identity.bucket
    }`
  )
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
 *   3. `x-forwarded-for`, at `TRUSTED_PROXY_HOPS` counted from the right
 *      (default 2, Railway's shape). Never the leftmost entry: that end of the
 *      list is written by the client.
 *   4. The socket address.
 *
 * >>> The day the API moves behind Cloudflare, two things change and both need
 * >>> doing. Cloudflare adds a hop, so `TRUSTED_PROXY_HOPS` becomes 3 — leave it
 * >>> at 2 and every visitor buckets under a Cloudflare edge address. Better,
 * >>> set `CLIENT_IP_SOURCE=cf` and read `cf-connecting-ip`, which Cloudflare
 * >>> writes itself, cannot be spoofed through, and does not move when the
 * >>> number of proxies changes underneath us.
 */
export const identifyClient = (req: MedusaRequest): ClientIdentity => {
  const internal = isInternalRequest(req)

  const resolve = (): Pick<ClientIdentity, "ip" | "realIp"> => {
    if (internal) {
      const real = normalizeIp(headerValue(req, "x-real-client-ip"))
      if (real) {
        return { ip: real, realIp: true }
      }
    }

    if (process.env.CLIENT_IP_SOURCE === "cf") {
      // Intentionally does NOT fall back to x-forwarded-for: behind Cloudflare
      // that list is client-paddable, so guessing from it would be worse than
      // sharing the socket bucket.
      const cf = normalizeIp(headerValue(req, "cf-connecting-ip"))
      return { ip: cf ?? normalizeIp(req.socket?.remoteAddress) ?? "unknown", realIp: false }
    }

    const edge =
      clientFromForwardedFor(req) ?? normalizeIp(req.socket?.remoteAddress)

    return { ip: edge ?? "unknown", realIp: false }
  }

  const { ip, realIp } = resolve()
  const identity = { ip, bucket: bucketForIp(ip), internal, realIp }

  warnSharedBucket(identity)
  debugIdentity(req, identity)

  return identity
}

/**
 * Best-effort client IP, for logging and audit trails. Behind Railway/Cloudflare
 * the socket address is the proxy's, so prefer the forwarding headers and fall
 * back to the socket.
 *
 * For a rate-limit key use `identifyClient(req).bucket` instead: an IPv6 caller
 * has a whole /64 to spend, and this returns one address out of it.
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
