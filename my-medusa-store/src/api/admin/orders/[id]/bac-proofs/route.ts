import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ProofFile, signProofs } from "../../../../../lib/bac-proof"
import {
  SIGNED_PROOF_URL_TTL_SECONDS,
  signedProofUrl,
} from "../../../../../lib/bac-proof-storage"

/**
 * The BAC transfer proofs of one order, each as a short-lived signed URL.
 *
 * This is the only way to open a receipt: they are bank data, and the order
 * metadata that lists them is readable by anyone holding the order id, so it
 * no longer carries a URL that opens them. Admin routes require an
 * authenticated user, so only the admin dashboard gets here.
 *
 * Proofs uploaded before the switch still store their old public URL; the key
 * is recovered from it, so those come back signed too and keep working once
 * the media domain stops serving `bank-transfers/`.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    filters: { id: req.params.id },
  })

  const order = orders?.[0]
  if (!order) {
    return res.status(404).json({ message: "Pedido no encontrado." })
  }

  const stored = order.metadata?.bac_transfer_proof
  const proofs = await signProofs(
    Array.isArray(stored) ? (stored as ProofFile[]) : [],
    process.env.R2_FILE_URL,
    signedProofUrl
  )

  return res.json({ proofs, expires_in: SIGNED_PROOF_URL_TTL_SECONDS })
}
