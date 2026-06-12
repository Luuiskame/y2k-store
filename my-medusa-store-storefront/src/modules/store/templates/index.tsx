import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="w-full">
        <div className="mb-8">
          <h1 data-testid="store-page-title" className="text-2xl-semi">
            Tienda Y2K Fit Honduras
          </h1>
          <p className="mt-3 max-w-3xl text-base-regular text-ui-fg-subtle">
            Bienvenido a la tienda de Y2K Fit Honduras, la primera tienda de
            ropa gótica y estilo Y2K del país. Aquí encuentras camisetas de
            compresión, ropa deportiva oscura y drops limitados inspirados en
            Breathe Divinity. Compra ropa y2k online con envío a todo Honduras
            — Tegucigalpa, San Pedro Sula y el resto del país.
          </p>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
