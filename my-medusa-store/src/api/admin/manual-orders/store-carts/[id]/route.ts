import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  readManualOrderMetadata,
  toStoreCartPrefill,
} from "../../../../../lib/manual-orders"
import { fetchCart } from "../../queries"

/**
 * One storefront cart as the starting point of "Nuevo pedido": its products,
 * the customer and address the customer typed, how they chose to ship it and
 * the discount codes they applied.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cart = await fetchCart(req.scope, req.params.id)

  if (!cart || readManualOrderMetadata(cart.metadata)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No se encontró ese carrito de la tienda."
    )
  }

  res.json({ cart: toStoreCartPrefill(cart) })
}
