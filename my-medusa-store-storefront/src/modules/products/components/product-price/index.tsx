import { clx } from "@medusajs/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return (
      <div
        className="block w-32 h-9 animate-pulse rounded-rounded"
        style={{ backgroundColor: "var(--brand-abyss-purple)" }}
      />
    )
  }

  const isSale = selectedPrice.price_type === "sale"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span
          className={clx(
            "font-heading text-3xl small:text-4xl tracking-wide",
            isSale ? "text-brand-divine-lilac" : "text-brand-ghost-white"
          )}
        >
          {!variant && (
            <span className="text-sm text-brand-silver-ash mr-1 font-body normal-case tracking-normal">
              Desde
            </span>
          )}
          <span
            data-testid="product-price"
            data-value={selectedPrice.calculated_price_number}
          >
            {selectedPrice.calculated_price}
          </span>
        </span>

        {isSale && (
          <span
            className="line-through text-sm text-brand-silver-ash"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </span>
        )}

        {isSale && (
          <span className="badge-glow text-[10px]">
            -{selectedPrice.percentage_diff}% OFF
          </span>
        )}
      </div>

      <span className="text-[11px] uppercase tracking-[0.2em] text-brand-silver-ash/70">
        Envio gratis a todo Honduras
      </span>
    </div>
  )
}
