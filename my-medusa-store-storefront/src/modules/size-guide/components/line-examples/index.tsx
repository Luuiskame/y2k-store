import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

type LineExamplesProps = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
}

/**
 * Real garments of one line, so "Medium Muscle Fit" or "baggy" is something
 * the shopper can look at next to the numbers. Fetched, never typed in:
 * which models exist changes every drop. Renders nothing when the line has
 * nothing buyable, since a section promising examples over an empty grid
 * costs more trust than it earns.
 */
const LineExamples = ({ products, region }: LineExamplesProps) => {
  if (!products.length) {
    return null
  }

  return (
    <div className="mt-10" data-testid="line-examples">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-heading text-sm uppercase tracking-[0.18em] text-brand-ghost-white">
          Así se ve en la tienda
        </h3>
        <LocalizedClientLink
          href="/store"
          className="text-xs underline underline-offset-4"
        >
          Ver toda la tienda
        </LocalizedClientLink>
      </div>
      <ul className="grid grid-cols-2 gap-4 small:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductPreview product={product} region={region} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LineExamples
