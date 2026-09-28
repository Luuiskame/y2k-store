import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Runs ahead of Medusa's own middlewares for one namespace. Resolves to true
 * when it has already answered the request (a 429, say), false to let it on.
 */
export type NamespaceGuard = (
  req: MedusaRequest,
  res: MedusaResponse
) => Promise<boolean>

type Middleware = (
  req: any,
  res: any,
  next: (error?: unknown) => void
) => unknown

type TraceMiddleware = (
  handler: any,
  meta: { route: string; method?: string }
) => any

/** The one piece of `ApiLoader` this file touches. */
type TraceHooks = { traceMiddleware?: TraceMiddleware }

const HOOK_MARK = Symbol.for("y2k.namespace-guard")

/** Requests a guard has already run for, so it runs once per request. */
const guardedRequests = new WeakSet<object>()

/** Namespaces whose Medusa middlewares actually got a guard in front. */
const wrappedNamespaces = new Set<string>()

let lastGuardFailureLog = 0

const logGuardFailure = (namespace: string, error: unknown): void => {
  const now = Date.now()
  if (now - lastGuardFailureLog < 10_000) {
    return
  }
  lastGuardFailureLog = now

  const reason = error instanceof Error ? error.message : String(error)
  console.warn(
    `[namespace-guard] guard for ${namespace} threw — request let through: ${reason}`
  )
}

/**
 * Puts a guard in front of the middlewares Medusa itself registers for a
 * namespace (`/store`, `/admin`), which nothing in `defineMiddlewares` can do.
 *
 * Why this is needed: `ApiLoader.load()` registers, per namespace, CORS, then
 * the publishable-key check for `/store` and authentication for `/admin`, and
 * only after all of that the project's `defineMiddlewares` entries. So a
 * `/store/*` limiter declared there never sees a request Medusa has already
 * turned away — and the publishable-key check is not free: any request that
 * carries *some* `x-publishable-api-key` value costs a Postgres query to look
 * it up (the `cache: { enable: true }` it passes is a no-op without the Caching
 * Module), before any limit applies. Same story for `/admin/*`, where
 * authentication runs first.
 *
 * How: `ApiLoader.traceMiddleware` is the public hook Medusa's OpenTelemetry
 * integration uses to wrap every middleware as it is registered, namespace ones
 * included. Setting it lets us wrap those too. Any hook already installed (the
 * OTel one) is kept and chained.
 *
 * It has to be installed before `ApiLoader.load()` registers the namespace
 * middlewares. `src/api/middlewares.ts` is imported early in that same call,
 * which is why it is installed from there. If a Medusa upgrade ever changes
 * that order, nothing gets wrapped: `isNamespaceGuarded` then returns false and
 * the fallback limiter in `middlewares.ts` both takes over and says so.
 */
export const installNamespaceGuards = (
  loader: TraceHooks,
  guards: Record<string, NamespaceGuard>
): void => {
  const previous = loader.traceMiddleware
  if (previous && (previous as any)[HOOK_MARK]) {
    return
  }

  const hook: TraceMiddleware = (handler, meta) => {
    const traced: Middleware = previous ? previous(handler, meta) : handler

    // Namespace middlewares are registered with the bare prefix and no method.
    // Everything else (body parsers, project and core route middlewares) is
    // handed back exactly as it came in.
    const guard = meta.method ? undefined : guards[meta.route]
    if (!guard) {
      return traced
    }

    wrappedNamespaces.add(meta.route)

    const guarded: Middleware = async (req, res, next) => {
      // Every namespace middleware gets wrapped; whichever runs first runs the
      // guard, the rest just pass through.
      if (!guardedRequests.has(req)) {
        guardedRequests.add(req)

        let answered = false
        try {
          answered = await guard(req, res)
        } catch (error) {
          logGuardFailure(meta.route, error)
        }

        if (answered) {
          return
        }
      }

      return traced(req, res, next)
    }

    return guarded
  }

  Object.defineProperty(hook, HOOK_MARK, { value: true })
  loader.traceMiddleware = hook
}

/** True once a namespace guard has run for this request. */
export const guardRanFor = (req: object): boolean => guardedRequests.has(req)

/** True when Medusa's middlewares for `namespace` were actually wrapped. */
export const isNamespaceGuarded = (namespace: string): boolean =>
  wrappedNamespaces.has(namespace)
