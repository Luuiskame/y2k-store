import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { spanishWorkflowError } from "../../../../../../lib/manual-orders"
import { setManualOrderShippingMethodWorkflow } from "../../../../../../workflows/manual-orders/create-working-cart"
import { fetchWorkingCartSummary } from "../../../queries"
import type { SetManualOrderShippingMethodBody } from "../../../validators"

/** Changes how the working cart ships and answers with the new totals. */
export async function POST(
  req: AuthenticatedMedusaRequest<SetManualOrderShippingMethodBody>,
  res: MedusaResponse
) {
  let result: { cart_id: string; shipping_options: any[] }
  try {
    const run = await setManualOrderShippingMethodWorkflow(req.scope).run({
      input: {
        cart_id: req.params.id,
        option_id: req.validatedBody.option_id,
      },
    })
    result = run.result
  } catch (error) {
    throw spanishWorkflowError(error)
  }

  const cart = await fetchWorkingCartSummary(
    req.scope,
    result.cart_id,
    result.shipping_options
  )

  res.json({ cart })
}
