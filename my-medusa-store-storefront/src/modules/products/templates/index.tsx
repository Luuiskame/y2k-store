import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const TrustItem = ({
  title,
  body,
  glyph,
}: {
  title: string
  body: string
  glyph: string
}) => (
  <div className="surface-card p-6 flex items-start gap-4">
    <span
      aria-hidden
      className="font-display text-2xl"
      style={{ color: "var(--brand-sacred-violet)" }}
    >
      {glyph}
    </span>
    <div className="flex flex-col gap-1">
      <span className="font-heading uppercase tracking-[0.18em] text-sm text-brand-ghost-white">
        {title}
      </span>
      <p className="text-xs leading-relaxed text-brand-silver-ash">{body}</p>
    </div>
  </div>
)

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      <div
        className="content-container py-8 small:py-12 relative"
        data-testid="product-container"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 small:gap-12">
          {/* Gallery — wide left column */}
          <div className="lg:col-span-7">
            <ImageGallery images={images} />
          </div>

          {/* Sticky purchase column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 flex flex-col gap-y-8">
              <ProductOnboardingCta />
              <ProductInfo product={product} />
              <Suspense
                fallback={
                  <ProductActions
                    disabled={true}
                    product={product}
                    region={region}
                  />
                }
              >
                <ProductActionsWrapper id={product.id} region={region} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip — three short signals to seal the conversion */}
      <div className="content-container pb-12">
        <div className="grid grid-cols-1 small:grid-cols-3 gap-4">
          <TrustItem
            glyph="✦"
            title="Envío Nacional"
            body="Entrega a todo Honduras en 2–5 días hábiles. Empaque ritual, sellado a mano."
          />
          <TrustItem
            glyph="❖"
            title="Cambios de Talla"
            body="Si la talla no encaja, te la cambiamos. 7 días desde la entrega."
          />
          <TrustItem
            glyph="✧"
            title="Calidad Premium"
            body="Tela técnica de compresión, costuras planas y acabados pensados para entrenar."
          />
        </div>
      </div>

      {/* Detail tabs — full width below the fold */}
      <div className="content-container pb-16 small:pb-24">
        <div className="max-w-3xl mx-auto">
          <ProductTabs product={product} />
        </div>
      </div>

      <div
        className="content-container my-16 small:my-24"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
