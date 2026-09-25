import { Suspense } from "react"

import { SortOptions } from "@lib/util/catalog"
import { HttpTypes } from "@medusajs/types"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import Breadcrumbs from "@modules/store/components/breadcrumbs"
import StoreCatalog from "@modules/store/components/store-catalog"

export default function CollectionTemplate({
  sortBy,
  collection,
  countryCode,
}: {
  sortBy: SortOptions
  collection: HttpTypes.StoreCollection
  countryCode: string
}) {
  return (
    <div
      className="content-container pt-5 pb-16 small:pt-10 small:pb-24"
      data-testid="collection-container"
    >
      <Breadcrumbs
        countryCode={countryCode}
        items={[
          { label: "Inicio", href: "/" },
          { label: "Tienda", href: "/store" },
          { label: collection.title },
        ]}
      />

      <header className="mt-3 mb-6 max-w-2xl small:mb-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brand-sacred-violet">
          Colección
        </p>
        <h1 className="mt-1 font-heading text-xl uppercase tracking-[0.12em] text-brand-ghost-white small:text-4xl">
          {collection.title}
        </h1>
      </header>

      {/* Category chips stay on: the home links here with ?categoria= when a
          filter is active. With a single category in the collection the
          row hides itself, and the filter still applies. */}
      <Suspense fallback={<SkeletonProductGrid numberOfProducts={8} />}>
        <StoreCatalog
          countryCode={countryCode}
          collectionId={collection.id}
          sort={sortBy}
        />
      </Suspense>
    </div>
  )
}
