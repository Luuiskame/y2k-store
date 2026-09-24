import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"
import ProductCarousel from "@modules/home/components/featured-products/product-carousel"

const RAIL_LIMIT = 4

export default async function ProductRail({
  category,
  region,
}: {
  category: HttpTypes.StoreProductCategory
  region: HttpTypes.StoreRegion
}) {
  const href = `/categories/${category.handle}`

  const {
    response: { products: pricedProducts, count },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      category_id: [category.id],
      // `fields` replaces the default in listProducts rather than merging, so
      // tags have to be restated here or the "Más vendido" badge never fires.
      // `*tags`, not `+tags` — it's a relation and only `*` expands it.
      fields: "*variants.calculated_price,*tags",
      limit: RAIL_LIMIT,
    },
  })

  if (!pricedProducts?.length) {
    return null
  }

  const hasMore = count > pricedProducts.length

  return (
    <div className="content-container py-10 small:py-16">
      <div className="flex justify-between items-center gap-4 mb-6">
        <h2
          className="font-heading text-xl"
          style={{ color: "var(--brand-ghost-white)" }}
        >
          {category.name}
        </h2>

        {/* A bordered pill, not a bare text link — the old one had no
            underline, no chrome and a sub-44px tap target, so it read as a
            label rather than a control. */}
        <LocalizedClientLink
          href={href}
          className="inline-flex items-center gap-x-1.5 shrink-0 min-h-[44px] px-4 rounded-full
                     font-heading uppercase tracking-[0.16em] text-[11px] small:text-xs whitespace-nowrap
                     border transition-all duration-200 ease-in
                     hover:border-brand-sacred-violet hover:shadow-[0_0_20px_rgba(155,77,202,0.35)]"
          style={{
            backgroundColor: "var(--brand-abyss-purple)",
            borderColor: "var(--brand-amethyst)",
            color: "var(--brand-ghost-white)",
          }}
          data-testid={`view-all-${category.handle}`}
        >
          Ver todo
          <span aria-hidden style={{ color: "var(--brand-sacred-violet)" }}>
            →
          </span>
        </LocalizedClientLink>
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

        {/* End-of-rail card: catches the phone user who swipes to the end of
            the row, which is exactly when intent peaks. Hidden on desktop so
            the 4-column grid stays intact — the header pill covers it there. */}
        {hasMore && (
          <div className="flex-none w-[160px] snap-start small:hidden">
            <LocalizedClientLink
              href={href}
              className="group flex h-full flex-col items-center justify-center gap-3 rounded-xl px-4 aspect-[3/4] transition-all duration-300"
              style={{
                background:
                  "linear-gradient(180deg, var(--brand-void-black) 0%, var(--brand-abyss-purple) 100%)",
                border: "1px dashed var(--brand-amethyst)",
              }}
              aria-label={`Ver todo en ${category.name}`}
            >
              <span
                aria-hidden
                className="flex items-center justify-center w-11 h-11 rounded-full text-lg transition-transform duration-200 group-hover:translate-x-1"
                style={{
                  backgroundColor: "var(--brand-violet-deep)",
                  color: "var(--brand-ghost-white)",
                }}
              >
                →
              </span>
              <span
                className="font-heading uppercase tracking-[0.16em] text-[11px] text-center leading-snug"
                style={{ color: "var(--brand-ghost-white)" }}
              >
                Ver todo
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-brand-silver-ash">
                {count} productos
              </span>
            </LocalizedClientLink>
          </div>
        )}
      </ProductCarousel>
    </div>
  )
}
