import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type CategoryPillsProps = {
  categories: HttpTypes.StoreProductCategory[]
}

/**
 * "Shop by category" strip, directly under the hero. With a handful of
 * categories this is navigation, not filtering — so each pill is a real link
 * to /categories/<handle> rather than client-side state. That keeps it
 * cacheable, crawlable, and free of an up-front product fetch.
 *
 * Mobile: horizontal scroll with edge fades. Desktop: centred and wrapping.
 */
const CategoryPills = ({ categories }: CategoryPillsProps) => {
  if (!categories.length) {
    return null
  }

  return (
    <nav
      aria-label="Categorías"
      className="content-container pt-8 pb-2 small:pt-10"
      data-testid="category-pills"
    >
      <h2 className="font-heading uppercase tracking-[0.22em] text-[11px] small:text-xs text-brand-silver-ash text-center mb-4">
        Explora por categoría
      </h2>

      <div className="relative">
        {/* Edge fades tell a phone user there is more to the right without
            a scrollbar to hint at it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10 small:hidden"
          style={{
            background:
              "linear-gradient(90deg, var(--brand-void-black) 0%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10 small:hidden"
          style={{
            background:
              "linear-gradient(270deg, var(--brand-void-black) 0%, transparent 100%)",
          }}
        />

        <ul
          className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x px-1 py-1
                     small:flex-wrap small:justify-center small:overflow-visible small:snap-none"
        >
          {categories.map((category) => (
            <li key={category.id} className="flex-none snap-start">
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full
                           font-heading uppercase tracking-[0.16em] text-[11px] small:text-xs whitespace-nowrap
                           border transition-all duration-200 ease-in
                           hover:border-brand-sacred-violet hover:shadow-[0_0_20px_rgba(155,77,202,0.35)]"
                style={{
                  backgroundColor: "var(--brand-abyss-purple)",
                  borderColor: "var(--brand-amethyst)",
                  color: "var(--brand-ghost-white)",
                }}
                data-testid="category-pill"
              >
                {category.name}
              </LocalizedClientLink>
            </li>
          ))}

          <li className="flex-none snap-start">
            <LocalizedClientLink
              href="/store"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-full
                         font-heading uppercase tracking-[0.16em] text-[11px] small:text-xs whitespace-nowrap
                         border border-transparent transition-all duration-200 ease-in
                         hover:border-brand-amethyst"
              style={{ color: "var(--brand-sacred-violet)" }}
            >
              Ver todo
              <span aria-hidden>→</span>
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default CategoryPills
