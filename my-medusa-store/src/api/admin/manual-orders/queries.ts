import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import {
  CART_TOTALS_FIELDS,
  WorkingCartSummary,
  toWorkingCartSummary,
} from "../../../lib/manual-orders"

/** A cart with everything the admin page shows, totals included. */
export const CART_FIELDS = [
  "id",
  "email",
  "currency_code",
  "region_id",
  "completed_at",
  "updated_at",
  "metadata",
  ...CART_TOTALS_FIELDS,
  "shipping_address.*",
  "promotions.code",
]

export const fetchCart = async (
  scope: MedusaContainer,
  cartId: string
): Promise<any | undefined> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: CART_FIELDS,
    filters: { id: cartId },
  })
  return data[0]
}

export const fetchWorkingCartSummary = async (
  scope: MedusaContainer,
  cartId: string,
  shippingOptions: any[]
): Promise<WorkingCartSummary> => {
  const cart = await fetchCart(scope, cartId)
  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No se encontró el pedido en preparación. Volvé a revisarlo."
    )
  }
  return toWorkingCartSummary(cart, shippingOptions)
}

/** The order a cart became, if it did. */
export const findOrderOfCart = async (
  scope: MedusaContainer,
  cartId: string
): Promise<{ id: string; display_id: number | null } | null> => {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: links } = await query.graph({
    entity: "order_cart",
    fields: ["order_id"],
    filters: { cart_id: cartId },
  })
  const orderId = (links[0] as any)?.order_id
  if (!orderId) {
    return null
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id"],
    filters: { id: orderId },
  })
  const order = orders[0] as any
  return order ? { id: order.id, display_id: order.display_id ?? null } : null
}
