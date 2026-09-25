import { notFound } from "next/navigation"
import { Suspense } from "react"

import { SortOptions } from "@lib/util/catalog"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import Breadcrumbs from "@modules/store/components/breadcrumbs"
import StoreCatalog from "@modules/store/components/store-catalog"

export default function CategoryTemplate({
  category,
  sortBy,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy: SortOptions
  countryCode: string
}) {
  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  const children = category.category_children ?? []

  return (
    <div
      className="content-container pt-5 pb-16 small:pt-10 small:pb-24"
      data-testid="category-container"
    >
      <Breadcrumbs
        countryCode={countryCode}
        items={[
          { label: "Inicio", href: "/" },
          { label: "Tienda", href: "/store" },
          // collected closest-first; the trail reads from the root
          ...parents
            .slice()
            .reverse()
            .map((parent) => ({
              label: parent.name,
              href: `/categories/${parent.handle}`,
            })),
          { label: category.name },
        ]}
      />

      <header className="mt-3 mb-6 max-w-2xl small:mb-8">
        <h1
          data-testid="category-page-title"
          className="font-heading text-xl uppercase tracking-[0.12em] text-brand-ghost-white small:text-4xl"
        >
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-2 text-sm leading-relaxed text-brand-silver-ash">
            {category.description}
          </p>
        )}
      </header>

      {children.length > 0 && (
        <ul className="mb-6 flex flex-wrap gap-2">
          {children.map((child) => (
            <li key={child.id}>
              <LocalizedClientLink
                href={`/categories/${child.handle}`}
                className="inline-flex min-h-[44px] items-center rounded-full border border-brand-amethyst bg-brand-abyss-purple px-4 font-heading text-[11px] uppercase tracking-[0.14em] text-brand-ghost-white transition-colors hover:border-brand-sacred-violet"
              >
                {child.name}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      )}

      <Suspense fallback={<SkeletonProductGrid numberOfProducts={8} />}>
        <StoreCatalog
          countryCode={countryCode}
          categoryId={category.id}
          categoryFilter={false}
          sort={sortBy}
        />
      </Suspense>
    </div>
  )
}
