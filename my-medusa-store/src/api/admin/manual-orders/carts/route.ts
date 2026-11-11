import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  mergeItems,
  normalizeAddress,
  spanishWorkflowError,
} from "../../../../lib/manual-orders"
import { createManualOrderCartWorkflow } from "../../../../workflows/manual-orders/create-working-cart"
import { fetchWorkingCartSummary } from "../queries"
import type { CreateManualOrderCartBody } from "../validators"

/**
 * Builds the working cart of an order being registered from the admin and
 * answers with its totals and the ways it can ship: what the page shows for
 * review before the order exists. Nothing is ordered or reserved here.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<CreateManualOrderCartBody>,
  res: MedusaResponse
) {
  const body = req.validatedBody

  let result: { cart_id: string; shipping_options: any[] }
  try {
    const run = await createManualOrderCartWorkflow(req.scope).run({
      input: {
        actor_id: req.auth_context.actor_id,
        items: mergeItems(body.items),
        email: body.email ?? null,
        shipping_address: normalizeAddress(body.shipping_address),
        promo_codes: body.promo_codes,
        shipping_option_id: body.shipping_option_id ?? null,
        source_cart_id: body.source_cart_id ?? null,
        replace_cart_id: body.replace_cart_id ?? null,
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
