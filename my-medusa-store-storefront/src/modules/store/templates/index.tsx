import { Suspense } from "react"

import { SortOptions } from "@lib/util/catalog"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import Breadcrumbs from "@modules/store/components/breadcrumbs"
import StoreCatalog from "@modules/store/components/store-catalog"
import TrustStrip from "@modules/store/components/trust-strip"

const StoreTemplate = ({
  sortBy,
  countryCode,
}: {
  sortBy: SortOptions
  countryCode: string
}) => {
  return (
    <div
      className="content-container pt-5 pb-16 small:pt-10 small:pb-24"
      data-testid="category-container"
    >
      <Breadcrumbs
        countryCode={countryCode}
        items={[{ label: "Inicio", href: "/" }, { label: "Tienda" }]}
      />

      <header className="mt-3 mb-5 flex flex-col gap-4 small:mb-8 small:flex-row small:items-end small:justify-between small:gap-10">
        <div className="max-w-xl">
          <h1
            data-testid="store-page-title"
            className="font-heading text-lg uppercase tracking-[0.1em] text-brand-ghost-white small:text-4xl small:tracking-[0.12em]"
          >
            Tienda Y2K Fit Honduras
          </h1>
          {/* Phones skip it: the trust strip right below already says it,
              and every line here pushes the first product further down. */}
          <p className="mt-2 hidden text-sm leading-relaxed text-brand-silver-ash small:block">
            Camisetas de compresión góticas, joggers y drops limitados, con
            envío a toda Honduras.
          </p>
        </div>
        <TrustStrip className="shrink-0" />
      </header>

      <Suspense fallback={<SkeletonProductGrid numberOfProducts={8} />}>
        <StoreCatalog countryCode={countryCode} sort={sortBy} searchable />
      </Suspense>

      {/* This copy used to sit above the grid and pushed the first product
          below the fold on a phone. Same words, after the products. */}
      <section
        aria-labelledby="store-about"
        className="mt-20 border-t border-brand-amethyst pt-10 small:mt-28"
      >
        <h2
          id="store-about"
          className="font-heading text-base uppercase tracking-[0.14em] text-brand-ghost-white small:text-lg"
        >
          Ropa gótica y estilo Y2K en Honduras
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-brand-silver-ash">
          Bienvenido a la tienda de Y2K Fit Honduras, la primera tienda de ropa
          gótica y estilo Y2K del país. Aquí encuentras camisetas de
          compresión, ropa deportiva oscura y drops limitados inspirados en
          Breathe Divinity. Compra ropa y2k online con envío a todo Honduras
          — Tegucigalpa, San Pedro Sula y el resto del país.
        </p>
      </section>
    </div>
  )
}

export default StoreTemplate
