import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}

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
