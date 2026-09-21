import { MedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

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
    count = (await cache.get<number>(cacheKey)) ?? 0
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
    await cache.set(cacheKey, count + 1, windowSeconds)
  } catch {
    // Same reasoning as above.
  }

  return { allowed: true, remaining: limit - count - 1, retryAfter: 0 }
}

/**
 * Best-effort client IP. Behind Railway/Cloudflare the socket address is the
 * proxy's, so prefer the forwarding headers and fall back to the socket.
 */
export const clientIp = (req: MedusaRequest): string => {
  const forwarded = req.headers["x-forwarded-for"]
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded

  if (raw) {
    const first = raw.split(",")[0]?.trim()
    if (first) {
      return first
    }
  }

  return (
    (req.headers["cf-connecting-ip"] as string | undefined) ??
    req.socket?.remoteAddress ??
    "unknown"
  )
}
