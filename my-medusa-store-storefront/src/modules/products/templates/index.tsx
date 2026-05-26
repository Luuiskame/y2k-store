import React, { Suspense } from "react"

import Cash from "@modules/common/icons/cash"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import FounderStrip from "@modules/products/components/founder-strip"
import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductFAQ from "@modules/products/components/product-faq"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ReviewsSection from "@modules/products/components/reviews-section"
import SocialAnchor from "@modules/products/components/social-anchor"
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
  icon,
}: {
  title: string
  body: string
  icon: React.ReactNode
}) => (
  <div className="surface-card p-6 flex items-start gap-4">
    <span
      aria-hidden
      className="shrink-0"
      style={{ color: "var(--brand-sacred-violet)" }}
    >
      {icon}
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

      {/* Founder strip — closes the "¿quién está detrás?" gap before anything else */}
      <FounderStrip />

      {/* Trust strip — payment-first signals for the Honduran buyer */}
      <div className="content-container pb-12">
        <div className="grid grid-cols-1 small:grid-cols-3 gap-4">
          <TrustItem
            icon={<Cash size="24" />}
            title="Pago Contra Entrega"
            body="Tegus y SPS. Paga cuando recibas tu pedido en la puerta."
          />
          <TrustItem
            icon={<Refresh size="24" />}
            title="Cambio de Talla Gratis"
            body="7 días desde la entrega. Nosotros pagamos el reenvío."
          />
          <TrustItem
            icon={<FastDelivery size="24" />}
            title="Envío Rastreado"
            body="Te mandamos el número de guía por WhatsApp en cuanto sale."
          />
        </div>
      </div>

      {/* Reviews — placeholder until the reviews module ships */}
      <ReviewsSection />

      {/* Detail tabs — full width below the fold */}
      <div className="content-container pb-16 small:pb-24">
        <div className="max-w-3xl mx-auto">
          <ProductTabs product={product} />
        </div>
      </div>

      {/* Social anchor — proof of life on TikTok / IG / FB */}
      <SocialAnchor />

      {/* Product-flavored FAQ — links out to /preguntas-frecuentes for the rest */}
      <ProductFAQ />

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
