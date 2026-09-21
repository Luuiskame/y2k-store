import { defineMiddlewares, MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import multer from "multer"

import {
  ACCEPTED_MIME_TYPES,
  IP_WINDOW_SECONDS,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE,
  MAX_REQUESTS_PER_IP,
} from "../lib/bac-proof"
import {
  AUTH_LIMIT,
  GLOBAL_WINDOW_SECONDS,
  GlobalLimit,
  STORE_LIMIT,
  clientIp,
  consumeRateLimit,
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

/**
 * Blanket per-IP throttle. Every other limiter stacks on top of this one.
 *
 * `keyPrefix` keeps each route family in its own bucket, so a visitor browsing
 * the shop never eats into their own `/auth` or `bac-proof` allowance.
 */
const globalRateLimit =
  (keyPrefix: string, limit: GlobalLimit) =>
  async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const identity = identifyClient(req)

    const { allowed, retryAfter } = await consumeRateLimit(
      req,
      `${keyPrefix}${identity.ip}`,
      limitFor(limit, identity),
      GLOBAL_WINDOW_SECONDS
    )

    if (!allowed) {
      res.setHeader("Retry-After", String(retryAfter))
      return res.status(429).json({
        message:
          "Demasiadas peticiones. Espera unos segundos e inténtalo de nuevo.",
        retry_after: retryAfter,
      })
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
    req,
    `bac-proof:ip:${clientIp(req)}`,
    MAX_REQUESTS_PER_IP,
    IP_WINDOW_SECONDS
  )

  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfter))
    return res.status(429).json({
      message:
        "Demasiados intentos de subida. Espera unos minutos e inténtalo de nuevo.",
      retry_after: retryAfter,
    })
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
 * "global", so both throttles below land ahead of the `bac-proof` entry
 * (a static matcher) and its limiter stacks on top of theirs. Verified against
 * a running 2.13.1 server, not just read off the sorter.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/*",
      middlewares: [globalRateLimit("store:ip:", STORE_LIMIT) as any],
    },
    {
      matcher: "/auth/*",
      middlewares: [globalRateLimit("auth:ip:", AUTH_LIMIT) as any],
    },
    {
      matcher: "/store/orders/:id/bac-proof",
      method: ["POST"],
      middlewares: [bacProofRateLimit as any, uploadProofFiles as any],
    },
  ],
})
