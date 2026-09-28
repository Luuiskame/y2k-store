import {
  ApiLoader,
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import multer from "multer"

import { AnalyticsRangeSchema } from "./admin/analytics/validators"
import { AnalyticsEventSchema } from "./store/analytics/events/validators"
import {
  ACCEPTED_MIME_TYPES,
  IP_WINDOW_SECONDS,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE,
  MAX_REQUESTS_PER_IP,
} from "../lib/bac-proof"
import {
  guardRanFor,
  installNamespaceGuards,
  isNamespaceGuarded,
} from "../lib/namespace-guard"
import {
  ADMIN_LIMIT,
  AUTH_IDENTIFIER_LIMIT,
  AUTH_IDENTIFIER_WINDOW_SECONDS,
  AUTH_LIMIT,
  GLOBAL_WINDOW_SECONDS,
  GlobalLimit,
  STORE_LIMIT,
  authIdentifier,
  consumeRateLimit,
  identifierBucket,
  identifyClient,
  limitFor,
} from "../lib/rate-limit"

if (!process.env.STOREFRONT_SHARED_SECRET) {
  // Not fatal by design (see `isInternalRequest`): the shop keeps serving, its
  // own traffic just falls into the external class and gets the tighter limit.
  console.warn(
    "[rate-limit] STOREFRONT_SHARED_SECRET is not set. Storefront traffic will be rate limited as external, bucketed by Vercel's egress address. Set it on the Railway server and worker services, and on Vercel."
  )
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
    fields: 5,
    parts: MAX_FILES_PER_REQUEST + 5,
  },
  // Cheap first pass so an obviously wrong file never reaches memory. The
  // route still sniffs the bytes, because this header is client-controlled.
  fileFilter: (_req, file, cb) => {
    cb(null, ACCEPTED_MIME_TYPES.includes(file.mimetype))
  },
})

const tooManyRequests = (
  res: MedusaResponse,
  retryAfter: number,
  message: string
) => {
  res.setHeader("Retry-After", String(retryAfter))
  res.status(429).json({ message, retry_after: retryAfter })
}

/**
 * Blanket per-IP throttle. Every other limiter stacks on top of this one.
 * Resolves to true when it has answered with a 429.
 *
 * `keyPrefix` keeps each route family in its own bucket, so a visitor browsing
 * the shop never eats into their own `/auth` or `bac-proof` allowance.
 */
const applyGlobalLimit = async (
  req: MedusaRequest,
  res: MedusaResponse,
  keyPrefix: string,
  limit: GlobalLimit
): Promise<boolean> => {
  const identity = identifyClient(req)

  const { allowed, retryAfter } = await consumeRateLimit(
    `${keyPrefix}${identity.bucket}`,
    limitFor(limit, identity),
    GLOBAL_WINDOW_SECONDS
  )

  if (allowed) {
    return false
  }

  tooManyRequests(
    res,
    retryAfter,
    "Demasiadas peticiones. Espera unos segundos e inténtalo de nuevo."
  )
  return true
}

/**
 * `/store/*` and `/admin/*` are limited *ahead of* Medusa's own middlewares
 * for those namespaces — the publishable-key lookup and admin authentication —
 * because both do work (a Postgres query, credential checks) on requests that
 * would otherwise never be counted. See `namespace-guard.ts` for why this
 * cannot be done from `defineMiddlewares` and how it is done instead.
 */
installNamespaceGuards(ApiLoader, {
  "/store": (req, res) => applyGlobalLimit(req, res, "store:ip:", STORE_LIMIT),
  "/admin": (req, res) => applyGlobalLimit(req, res, "admin:ip:", ADMIN_LIMIT),
})

const warnedUnguarded = new Set<string>()

/**
 * The same limit from inside `defineMiddlewares`, for a request the namespace
 * guard did not see. Normally a pass-through. If it ever does the counting,
 * the guard is not installed — most likely a Medusa upgrade changed how
 * `ApiLoader` registers its middlewares — and requests Medusa rejects early
 * are no longer counted, so say so once per process.
 */
const fallbackRateLimit =
  (namespace: string, keyPrefix: string, limit: GlobalLimit) =>
  async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    if (guardRanFor(req)) {
      return next()
    }

    if (!isNamespaceGuarded(namespace) && !warnedUnguarded.has(namespace)) {
      warnedUnguarded.add(namespace)
      console.warn(
        `[rate-limit] the ${namespace}/* limiter is running after Medusa's own middlewares: requests they reject (no publishable key, failed admin auth) are not being counted. Check that ApiLoader.traceMiddleware still wraps them (src/lib/namespace-guard.ts).`
      )
    }

    if (await applyGlobalLimit(req, res, keyPrefix, limit)) {
      return
    }

    return next()
  }

const globalRateLimit =
  (keyPrefix: string, limit: GlobalLimit) =>
  async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    if (await applyGlobalLimit(req, res, keyPrefix, limit)) {
      return
    }

    return next()
  }

/**
 * Per-account throttle for `/auth/*`: counts attempts against the email in the
 * body, whichever address they come from. It runs after the per-IP limit (see
 * the ordering note on `defineMiddlewares` below), so a request already refused
 * for its address is not counted against the account as well.
 *
 * The body is already parsed here — Medusa runs its body parsers for every
 * route before any namespace or project middleware.
 */
const authIdentifierRateLimit = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const identifier = authIdentifier(req.body)
  if (!identifier) {
    return next()
  }

  const { allowed, retryAfter } = await consumeRateLimit(
    `auth:id:${identifierBucket(identifier)}`,
    AUTH_IDENTIFIER_LIMIT,
    AUTH_IDENTIFIER_WINDOW_SECONDS
  )

  if (!allowed) {
    return tooManyRequests(
      res,
      retryAfter,
      "Demasiados intentos con esta cuenta. Espera unos minutos e inténtalo de nuevo."
    )
  }

  return next()
}

/**
 * Per-IP throttle for proof uploads. Runs *before* multer so a flood is
 * rejected before we buffer up to 24MB of request body per call.
 */
const bacProofRateLimit = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const { allowed, retryAfter } = await consumeRateLimit(
    `bac-proof:ip:${identifyClient(req).bucket}`,
    MAX_REQUESTS_PER_IP,
    IP_WINDOW_SECONDS
  )

  if (!allowed) {
    return tooManyRequests(
      res,
      retryAfter,
      "Demasiados intentos de subida. Espera unos minutos e inténtalo de nuevo."
    )
  }

  return next()
}

const multerErrorMessage = (err: multer.MulterError): string => {
  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      return `Cada archivo debe pesar menos de ${
        MAX_FILE_SIZE / (1024 * 1024)
      }MB.`
    case "LIMIT_FILE_COUNT":
    case "LIMIT_PART_COUNT":
    case "LIMIT_FIELD_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return `Puedes enviar un máximo de ${MAX_FILES_PER_REQUEST} archivos a la vez.`
    default:
      return "No pudimos procesar el archivo. Intenta con otro."
  }
}

/**
 * Runs multer and turns its limit errors into the same Spanish 400s the route
 * returns, instead of letting them bubble up as a generic 500.
 *
 * This wraps multer rather than being registered as a separate Express error
 * handler. A 4-argument `(err, req, res, next)` function in this array is NOT
 * treated as an error handler — Medusa invokes it like any other middleware,
 * so it receives `(req, res, next)`, `next` lands in the 4th slot as
 * `undefined`, and the fallthrough `next(err)` throws a TypeError. That turned
 * EVERY request through this route into a 500, including valid uploads.
 */
const uploadProofFiles = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const run = upload.array("files", MAX_FILES_PER_REQUEST) as any

  run(req, res, (err: any) => {
    if (!err) {
      return next()
    }

    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: multerErrorMessage(err) })
    }

    return next(err)
  })
}

/**
 * Order in this array is NOT the registration order — Medusa runs it through
 * `RoutesSorter`, which buckets by matcher shape and registers in the order
 * `global > wildcard > regex > static > params`. An entry with no `method` is
 * "global", so the per-IP throttles land ahead of the per-account `/auth/*`
 * entry and of the `bac-proof` entry, and those limiters stack on top of
 * theirs. Verified against a running 2.13.1 server, not just read off the
 * sorter.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/*",
      middlewares: [
        fallbackRateLimit("/store", "store:ip:", STORE_LIMIT) as any,
      ],
    },
    {
      matcher: "/admin/*",
      middlewares: [
        fallbackRateLimit("/admin", "admin:ip:", ADMIN_LIMIT) as any,
      ],
    },
    {
      matcher: "/auth/*",
      middlewares: [globalRateLimit("auth:ip:", AUTH_LIMIT) as any],
    },
    {
      matcher: "/auth/*",
      method: ["POST"],
      middlewares: [authIdentifierRateLimit as any],
    },
    {
      matcher: "/store/orders/:id/bac-proof",
      method: ["POST"],
      middlewares: [bacProofRateLimit as any, uploadProofFiles as any],
    },
    {
      // A beacon is a few hundred bytes; anything near the cap is not one.
      matcher: "/store/analytics/events",
      method: ["POST"],
      bodyParser: { sizeLimit: "4kb" },
      middlewares: [validateAndTransformBody(AnalyticsEventSchema) as any],
    },
    {
      matcher: "/admin/analytics/sales",
      method: ["GET"],
      middlewares: [validateAndTransformQuery(AnalyticsRangeSchema, {}) as any],
    },
    {
      matcher: "/admin/analytics/traffic",
      method: ["GET"],
      middlewares: [validateAndTransformQuery(AnalyticsRangeSchema, {}) as any],
    },
  ],
})
