import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"
import ProductCarousel from "@modules/home/components/featured-products/product-carousel"

export default async function ProductRail({
  collection,
  region,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
}) {
  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
    },
  })

  if (!pricedProducts?.length) {
    return null
  }

  return (
    <div className="content-container py-10 small:py-16">
      <div className="flex justify-between items-baseline mb-6">
        <h2 className="font-heading text-xl" style={{ color: "var(--brand-ghost-white)" }}>
          {collection.title}
        </h2>
        <InteractiveLink href={`/collections/${collection.handle}`}>
          View all
        </InteractiveLink>
      </div>

      <ProductCarousel>
        {pricedProducts.map((product) => (
          <div
            key={product.id}
            className="flex-none w-[160px] snap-start small:w-auto small:snap-none"
          >
            <ProductPreview product={product} region={region} />
          </div>
        ))}
      </ProductCarousel>
    </div>
  )
}
