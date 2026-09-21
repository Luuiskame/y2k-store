import { defineMiddlewares, MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import multer from "multer"

import {
  ACCEPTED_MIME_TYPES,
  IP_WINDOW_SECONDS,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE,
  MAX_REQUESTS_PER_IP,
} from "../lib/bac-proof"
import { clientIp, consumeRateLimit } from "../lib/rate-limit"

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

/**
 * Turns multer's limit errors into the same Spanish 400s the route returns,
 * instead of letting them bubble up as a generic 500.
 */
const handleUploadErrors = (
  err: any,
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `Cada archivo debe pesar menos de ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_PART_COUNT"
        ? `Puedes enviar un máximo de ${MAX_FILES_PER_REQUEST} archivos a la vez.`
        : "No pudimos procesar el archivo. Intenta con otro."

    return res.status(400).json({ message })
  }

  return next(err)
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/orders/:id/bac-proof",
      method: ["POST"],
      middlewares: [
        bacProofRateLimit as any,
        upload.array("files", MAX_FILES_PER_REQUEST) as any,
        handleUploadErrors as any,
      ],
    },
  ],
})
