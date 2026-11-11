import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { spanishWorkflowError } from "../../../../../../lib/manual-orders"
import { completeManualOrderWorkflow } from "../../../../../../workflows/manual-orders/complete-working-cart"
import { findOrderOfCart } from "../../../queries"
import type { CompleteManualOrderBody } from "../../../validators"

/**
 * Places the order. Answers with the order that already exists when the same
 * working cart is completed twice (a second tap, a retry after a timeout), so
 * one review never becomes two orders.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<CompleteManualOrderBody>,
  res: MedusaResponse
) {
  const cartId = req.params.id

  const existing = await findOrderOfCart(req.scope, cartId)
  if (existing) {
    return res.json({ order: existing, already_placed: true })
  }

  const body = req.validatedBody
  try {
    const { result: order } = await completeManualOrderWorkflow(req.scope).run({
      input: {
        cart_id: cartId,
        payment_method: body.payment_method,
        apply_surcharge: body.apply_surcharge ?? true,
        note: body.note ?? null,
      },
    })

    res.json({ order, already_placed: false })
  } catch (error) {
    throw spanishWorkflowError(error)
  }
}
