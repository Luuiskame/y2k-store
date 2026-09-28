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

/**
 * Wall-clock budget shared by every SDK call made for one request.
 *
 * The per-call deadline alone does not bound a page, it multiplies: with the
 * backend hung, `/hn` took 16 s (two sequential calls × 8 s), and a page that
 * makes three or four in a row is back at Vercel's 25 s and a 504. So the
 * request's first call starts a clock, and each call gets what is left of it,
 * never more than the per-call deadline. Calls answered from Next's data cache
 * never reach the network and spend none of it.
 */
const REQUEST_BUDGET_MS = 10_000

/**
 * Floor for a call made after the budget is spent. With the backend down it
 * still fails fast; with the backend merely slow, a call that was about to
 * come back gets a real chance to.
 */
const MIN_CALL_TIMEOUT_MS = 1000

/**
 * One deadline per incoming request, keyed on the request's `headers()`
 * object: Next hands out that same object for the whole request, page render
 * and `generateMetadata` alike. React's `cache` would not do here — metadata
 * is resolved outside the React render, and measured against a hung backend it
 * got a fresh clock, which put a product page back at 16 s. The WeakMap entry
 * goes away with the request.
 */
const requestDeadlines = new WeakMap<object, number>()

const callTimeoutMs = async (): Promise<number> => {
  let request: object | null = null
  try {
    request = await nextHeaders()
  } catch {
    // No request to share a budget with (e.g. static generation): the call
    // just gets the per-call deadline.
  }

  if (!request) {
    return DEFAULT_TIMEOUT_MS
  }

  let deadline = requestDeadlines.get(request)
  if (deadline === undefined) {
    deadline = Date.now() + REQUEST_BUDGET_MS
    requestDeadlines.set(request, deadline)
  }

  return Math.min(
    DEFAULT_TIMEOUT_MS,
    Math.max(MIN_CALL_TIMEOUT_MS, deadline - Date.now())
  )
}

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
    signal: init?.signal ?? AbortSignal.timeout(await callTimeoutMs()),
  }
  return originalFetch(input, init)
}
