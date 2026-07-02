import { HttpTypes } from "@medusajs/types"
import { getPricesForVariant, getProductPrice } from "@lib/util/get-product-price"
import { trackMetaEvent } from "./meta-pixel"

/**
 * Maps Medusa data onto Meta (Facebook) Pixel standard e-commerce events.
 *
 * This is the single source of truth for how our products/cart/order map to
 * Meta's `content_ids`, `contents`, `value`, and `currency`. When the Commerce
 * Manager catalog + feed ship, keep the ids produced here in sync with the
 * feed's `id` / `item_group_id` so browser events match catalog items:
 *   - line-item events use the variant SKU (falling back to variant/product id)
 *   - ViewContent uses the product id (the "group"), so the feed should set
 *     `item_group_id = product.id` on every variant row.
 */

// Meta expects an uppercase ISO-4217 currency; Medusa stores it lowercase (hnl).
const toCurrency = (code?: string | null) => (code ?? "hnl").toUpperCase()

// Stable id for a cart/order line item. Prefer SKU (what the catalog feed keys
// on for apparel variants), then variant id, then product id.
const lineItemContentId = (item: any): string =>
  item?.variant?.sku ?? item?.variant_id ?? item?.product_id ?? ""

export function trackViewContent(product: HttpTypes.StoreProduct) {
  if (!product?.id) return

  const { cheapestPrice } = getProductPrice({ product })

  trackMetaEvent("ViewContent", {
    content_type: "product",
    content_ids: [product.id],
    content_name: product.title,
    value: cheapestPrice?.calculated_price_number,
    currency: toCurrency(cheapestPrice?.currency_code),
  })
}

export function trackAddToCart({
  product,
  variant,
  quantity = 1,
}: {
  product: HttpTypes.StoreProduct
  variant: HttpTypes.StoreProductVariant
  quantity?: number
}) {
  const price = getPricesForVariant(variant)
  const id = (variant as any).sku ?? variant.id

  trackMetaEvent("AddToCart", {
    content_type: "product",
    content_ids: [id],
    content_name: product.title,
    contents: [{ id, quantity }],
    value: price ? price.calculated_price_number * quantity : undefined,
    currency: toCurrency(price?.currency_code),
  })
}

export function trackInitiateCheckout(cart: HttpTypes.StoreCart) {
  const items = cart.items ?? []

  trackMetaEvent("InitiateCheckout", {
    content_type: "product",
    content_ids: items.map(lineItemContentId),
    contents: items.map((i) => ({
      id: lineItemContentId(i),
      quantity: i.quantity,
    })),
    num_items: items.reduce((sum, i) => sum + (i.quantity ?? 0), 0),
    value: cart.total ?? 0,
    currency: toCurrency(cart.currency_code),
  })
}

export function trackPurchase(order: HttpTypes.StoreOrder) {
  const items = order.items ?? []

  trackMetaEvent(
    "Purchase",
    {
      content_type: "product",
      content_ids: items.map(lineItemContentId),
      contents: items.map((i) => ({
        id: lineItemContentId(i),
        quantity: i.quantity,
      })),
      num_items: items.reduce((sum, i) => sum + (i.quantity ?? 0), 0),
      value: order.total ?? 0,
      currency: toCurrency(order.currency_code),
    },
    // Deterministic, server-reproducible id so the future Conversions API
    // Purchase event dedupes against this one.
    { eventID: order.id }
  )
}
