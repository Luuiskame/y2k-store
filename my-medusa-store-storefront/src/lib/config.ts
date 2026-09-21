import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"
import { headers as nextHeaders } from "next/headers"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}

const STOREFRONT_SHARED_SECRET = process.env.STOREFRONT_SHARED_SECRET

/**
 * Deadline applied to every SDK call that does not bring its own `signal`.
 * Without it a stalled backend holds a Vercel function open until the platform
 * kills it, which turns a slow API into a dead page instead of a degraded one.
 * Override per call by passing your own `signal` (e.g. for a large upload).
 */
const DEFAULT_TIMEOUT_MS = 8000

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

/**
 * The visitor's own address, so the backend limiter can bucket by them instead
 * of by the Vercel egress address every SDK call leaves from. On Vercel the
 * leftmost `x-forwarded-for` entry is the real client.
 *
 * `headers()` throws during static generation — same reason `getLocaleHeader()`
 * below is wrapped — so callers must tolerate `null`. It does not cost us any
 * static rendering either: `getLocaleHeader()` already reads `cookies()` on
 * every call, so these routes are dynamic with or without this.
 */
const getRealClientIp = async (): Promise<string | null> => {
  const incoming = await nextHeaders()
  const forwardedFor = incoming.get("x-forwarded-for")

  return forwardedFor?.split(",")[0]?.trim() || null
}

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  if (STOREFRONT_SHARED_SECRET) {
    headers["x-storefront-secret"] ??= STOREFRONT_SHARED_SECRET

    // Only worth sending alongside the secret — without it the backend ignores
    // the header, by design, so it cannot be used to mint rate limit buckets.
    try {
      const realClientIp = await getRealClientIp()
      if (realClientIp) {
        headers["x-real-client-ip"] ??= realClientIp
      }
    } catch {}
  }

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
    // Caller-supplied signals win, so a call that legitimately needs longer can
    // say so. `signal` does not affect Next's data cache: cacheability comes
    // from `cache`/`next.revalidate`, and the cache key from url + method +
    // headers + body.
    signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  }
  return originalFetch(input, init)
}
