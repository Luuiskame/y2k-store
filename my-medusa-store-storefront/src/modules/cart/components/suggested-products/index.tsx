import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"

type SuggestedProductsProps = {
  countryCode: string
  excludeIds?: string[]
}

const SuggestedProducts = async ({
  countryCode,
  excludeIds = [],
}: SuggestedProductsProps) => {
  const region = await getRegion(countryCode)

  if (!region) return null

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: {
      limit: 8,
      is_giftcard: false,
      fields: "*variants.calculated_price",
    },
  })

  const filtered = products
    .filter((p) => !excludeIds.includes(p.id))
    .slice(0, 4)

  if (!filtered.length) return null

  return (
    <section className="mt-16 small:mt-20">
      <div className="flex items-end justify-between mb-6">
        <div>
          <span
            className="block text-xs uppercase tracking-[0.18em] font-body mb-2"
            style={{ color: "var(--brand-sacred-violet)" }}
          >
            También para ti
          </span>
          <h2
            className="font-heading text-2xl small:text-3xl"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            Completa tu ritual
          </h2>
        </div>
      </div>

      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-4 small:gap-6">
        {filtered.map((product) => (
          <li key={product.id}>
            <ProductPreview product={product} region={region} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default SuggestedProducts
