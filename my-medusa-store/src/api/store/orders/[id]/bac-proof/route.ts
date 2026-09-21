import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import {
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE,
  MAX_PROOFS_PER_ORDER,
  ProofFile,
  UPLOAD_COOLDOWN_SECONDS,
  detectProofType,
  safeBaseName,
} from "../../../../../lib/bac-proof"

type UploadedFile = {
  fieldname: string
  originalname: string
  mimetype: string
  buffer: Buffer
  size: number
}

// Folder (key prefix) inside the R2 bucket where transfer proofs live.
const PROOF_FOLDER = "bank-transfers"

// Reuse the same R2 connection settings as the Medusa file-s3 provider so the
// public URLs resolve identically. We upload directly (instead of via the File
// module) because the s3 provider strips directory paths from filenames, which
// makes per-order folders impossible, and because it mis-decodes binary content
// as utf8 — corrupting images. Uploading the raw Buffer here avoids both.
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
})

const publicUrl = (key: string) =>
  `${process.env.R2_FILE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const files = (req as any).files as UploadedFile[] | undefined

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No se recibieron archivos." })
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return res.status(400).json({
      message: `Puedes enviar un máximo de ${MAX_FILES_PER_REQUEST} archivos a la vez.`,
    })
  }

  const oversized = files.find((f) => f.size > MAX_FILE_SIZE)
  if (oversized) {
    return res.status(400).json({
      message: `Cada archivo debe pesar menos de ${
        MAX_FILE_SIZE / (1024 * 1024)
      }MB.`,
    })
  }

  // Validate the bytes, not the headers: `originalname` and `mimetype` come
  // from the client, and these objects are served publicly from R2.
  const typed: { file: UploadedFile; mime: string; extension: string }[] = []
  for (const file of files) {
    const detected = detectProofType(file.buffer)
    if (!detected) {
      return res.status(400).json({
        message: "Formato no válido. Sube una imagen PNG, JPG o WEBP, o un PDF.",
      })
    }
    typed.push({ file, ...detected })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderService = req.scope.resolve(Modules.ORDER)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  const locking = req.scope.resolve(Modules.LOCKING)

  // Everything below reads the order, decides against it and writes it back.
  // Without a lock, parallel requests all read the same `existing` array and
  // the last write wins — which both loses proofs and lets the per-order cap
  // be bypassed by simply firing the requests concurrently.
  let result: { status: number; body: Record<string, unknown> }

  try {
    result = await locking.execute(
      `bac-proof:${orderId}`,
      async (): Promise<{ status: number; body: Record<string, unknown> }> => {
        const { data: orders } = await query.graph({
          entity: "order",
          fields: [
            "id",
            "display_id",
            "email",
            "status",
            "metadata",
            "currency_code",
            "total",
          ],
          filters: { id: orderId },
        })

        const order = orders?.[0]
        if (!order) {
          return { status: 404, body: { message: "Pedido no encontrado." } }
        }

        if (order.status === "canceled") {
          return {
            status: 409,
            body: { message: "Este pedido fue cancelado." },
          }
        }

        const transferStatus = order.metadata?.bac_transfer_status as
          | string
          | undefined

        if (transferStatus === "verified") {
          return {
            status: 409,
            body: {
              message:
                "El pago de este pedido ya fue verificado. No es necesario subir más comprobantes.",
            },
          }
        }

        const existing = ((order.metadata?.bac_transfer_proof as
          | ProofFile[]
          | undefined) ?? []) as ProofFile[]

        if (existing.length >= MAX_PROOFS_PER_ORDER) {
          return {
            status: 409,
            body: {
              message: `Ya recibimos el máximo de ${MAX_PROOFS_PER_ORDER} comprobantes para este pedido. Si necesitas enviar otro, escríbenos por WhatsApp.`,
              proof_count: existing.length,
              limit_reached: true,
            },
          }
        }

        if (existing.length + typed.length > MAX_PROOFS_PER_ORDER) {
          return {
            status: 409,
            body: {
              message: `Solo puedes subir ${
                MAX_PROOFS_PER_ORDER - existing.length
              } archivo(s) más para este pedido.`,
              proof_count: existing.length,
            },
          }
        }

        // Cooldown between accepted uploads. Persisted on the order rather
        // than in the cache so it survives restarts and cache eviction.
        const lastUploadedAt = order.metadata
          ?.bac_transfer_proof_last_uploaded_at as string | undefined

        if (lastUploadedAt) {
          const elapsed =
            (Date.now() - new Date(lastUploadedAt).getTime()) / 1000
          if (
            Number.isFinite(elapsed) &&
            elapsed >= 0 &&
            elapsed < UPLOAD_COOLDOWN_SECONDS
          ) {
            const retryAfter = Math.ceil(UPLOAD_COOLDOWN_SECONDS - elapsed)
            return {
              status: 429,
              body: {
                message: `Espera ${retryAfter} segundos antes de subir otro comprobante.`,
                retry_after: retryAfter,
              },
            }
          }
        }

        const now = new Date().toISOString()
        const newProofEntries = await Promise.all(
          typed.map(async ({ file, mime, extension }) => {
            const key = `${PROOF_FOLDER}/${orderId}/${Date.now()}-${safeBaseName(
              file.originalname
            )}.${extension}`
            await s3.send(
              new PutObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: key,
                Body: file.buffer,
                // The sniffed type, never the client's — see detectProofType.
                ContentType: mime,
                ContentDisposition: "inline",
                ACL: "public-read",
              })
            )
            return { url: publicUrl(key), uploaded_at: now }
          })
        )

        const allProof = [...existing, ...newProofEntries]

        await orderService.updateOrders([
          {
            id: orderId,
            metadata: {
              ...(order.metadata ?? {}),
              bac_transfer_proof: allProof,
              bac_transfer_status: "proof_uploaded",
              bac_transfer_proof_last_uploaded_at: now,
            },
          } as any,
        ])

        // Fire-and-forget event for subscribers (email notifications)
        try {
          await eventBus.emit({
            name: "bac_transfer.proof_uploaded",
            data: {
              order_id: orderId,
              proof_files: newProofEntries,
            },
          })
        } catch (err) {
          logger.error(`Failed to emit bac_transfer.proof_uploaded: ${err}`)
        }

        return {
          status: 200,
          body: {
            ok: true,
            status: "received",
            proof_files: allProof,
            remaining_uploads: MAX_PROOFS_PER_ORDER - allProof.length,
          },
        }
      },
      { timeout: 10 }
    )
  } catch (err) {
    // Almost always a lock-acquisition timeout, i.e. requests piling up on one
    // order. Tell the caller to slow down instead of returning a 500.
    logger.error(`bac-proof upload failed for order ${orderId}: ${err}`)
    res.setHeader("Retry-After", String(UPLOAD_COOLDOWN_SECONDS))
    return res.status(429).json({
      message:
        "Ya estamos procesando una subida para este pedido. Espera unos segundos e inténtalo de nuevo.",
      retry_after: UPLOAD_COOLDOWN_SECONDS,
    })
  }

  return res.status(result.status).json(result.body)
}
