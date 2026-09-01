import { HttpTypes } from "@medusajs/types"

// Mirrors the status the `transferencia-bac` payment provider and the
// `/store/orders/:id/bac-proof` route write into `order.metadata`:
//   pending        → order placed, customer hasn't uploaded anything yet
//   proof_uploaded → files received, waiting for the owner to verify them
//   verified       → admin confirmed the payment (bac-confirm route)
//   rejected       → payment canceled
export type BacTransferStatus =
  | "pending"
  | "proof_uploaded"
  | "verified"
  | "rejected"

export type BacProofFile = { url: string; uploaded_at: string }

export const getBacTransferStatus = (
  order: HttpTypes.StoreOrder
): BacTransferStatus =>
  (order.metadata?.bac_transfer_status as BacTransferStatus | undefined) ??
  "pending"

export const getBacTransferProof = (
  order: HttpTypes.StoreOrder
): BacProofFile[] =>
  (order.metadata?.bac_transfer_proof as BacProofFile[] | undefined) ?? []
