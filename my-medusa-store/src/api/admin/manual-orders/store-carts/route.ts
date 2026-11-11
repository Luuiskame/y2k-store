import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  CART_TOTALS_FIELDS,
  cartMatches,
  extractCartId,
  isOfferableCart,
  toStoreCartCard,
  waitingFirst,
} from "../../../../lib/manual-orders"
import type { StoreCartsQuery } from "../validators"

/** Carts older than this are not a sale in progress any more. */
const WINDOW_DAYS = 14

/**
 * How many recent carts are looked at before filtering. Most carts are
 * visitors who never reached the address step; this is enough to get past
 * them to the ones that did, without loading the whole fortnight.
 */
const SCAN_LIMIT = 60

const DEFAULT_LIMIT = 15

const CARD_FIELDS = [
  "id",
  "email",
  "currency_code",
  "completed_at",
  "updated_at",
  "metadata",
  ...CART_TOTALS_FIELDS,
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.city",
  "shipping_address.province",
]

/**
 * The storefront carts that could be a sale waiting on WhatsApp: open, with
 * products, and far enough into the checkout to have a phone number. The
 * ones still waiting first, most recently touched first; then the ones an
 * order was already registered from.
 *
 * `q` is whatever the owner typed or pasted. A cart id anywhere in it (the
 * storefront's WhatsApp message ends with one) finds that cart directly,
 * whatever its age; otherwise it filters by name, phone, email or city.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { q, limit } = req.validatedQuery as StoreCartsQuery
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const pastedId = extractCartId(q)
  if (pastedId) {
    const { data } = await query.graph({
      entity: "cart",
      fields: CARD_FIELDS,
      filters: { id: pastedId },
    })
    // A working cart of this feature is not a customer's cart.
    const carts = data.filter(
      (cart: any) => !cart.completed_at && isOfferableCart(cart)
    )
    return res.json({
      carts: carts.map(toStoreCartCard),
      matched_cart_id: pastedId,
    })
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const { data } = await query.graph({
    entity: "cart",
    fields: CARD_FIELDS,
    filters: {
      completed_at: null,
      updated_at: { $gte: since },
    } as any,
    pagination: { take: SCAN_LIMIT, skip: 0, order: { updated_at: "DESC" } },
  })

  const carts = waitingFirst(
    data.filter(
      (cart: any) => isOfferableCart(cart) && cartMatches(cart, q ?? "")
    )
  ).slice(0, limit ?? DEFAULT_LIMIT)

  res.json({ carts: carts.map(toStoreCartCard), matched_cart_id: null })
}
