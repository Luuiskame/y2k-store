import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

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

const sanitize = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100)

const publicUrl = (key: string) =>
  `${process.env.R2_FILE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const files = (req as any).files as UploadedFile[] | undefined

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No se recibieron archivos." })
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderService = req.scope.resolve(Modules.ORDER)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  // Verify the order exists
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata", "currency_code", "total"],
    filters: { id: orderId },
  })

  const order = orders?.[0]
  if (!order) {
    return res.status(404).json({ message: "Pedido no encontrado." })
  }

  // Upload each file straight to R2 under bank-transfers/<orderId>/
  const now = new Date().toISOString()
  const newProofEntries = await Promise.all(
    files.map(async (f) => {
      const key = `${PROOF_FOLDER}/${orderId}/${Date.now()}-${sanitize(
        f.originalname
      )}`
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          Body: f.buffer,
          ContentType: f.mimetype,
          ACL: "public-read",
        })
      )
      return { url: publicUrl(key), uploaded_at: now }
    })
  )

  const existing = ((order.metadata?.bac_transfer_proof as
    | { url: string; uploaded_at: string }[]
    | undefined) ?? []) as { url: string; uploaded_at: string }[]

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

  return res.status(200).json({
    ok: true,
    status: "received",
    proof_files: allProof,
  })
}
