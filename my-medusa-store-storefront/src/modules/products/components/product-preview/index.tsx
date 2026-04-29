import Image from "next/image"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({ product })

  const image = product.thumbnail ?? product.images?.[0]?.url

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div
        data-testid="product-wrapper"
        className="relative flex flex-col overflow-hidden rounded-xl transition-all duration-300 group-hover:glow-lilac"
        style={{
          background: "linear-gradient(180deg, var(--brand-void-black) 0%, var(--brand-abyss-purple) 100%)",
          border: "1px solid var(--brand-amethyst)",
        }}
      >
        {/* Image area */}
        <div
          className="relative w-full overflow-hidden aspect-[3/4]"
        >
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              draggable={false}
              quality={75}
              sizes="(max-width: 1023px) 160px, (max-width: 1279px) 25vw, (max-width: 1439px) 25vw, 340px"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "var(--brand-abyss-purple)" }}
            >
              <PlaceholderImage size={32} />
            </div>
          )}

          {isFeatured && (
            <span className="badge-glow absolute top-2 right-2 text-[10px]">
              Destacado
            </span>
          )}
        </div>

        {/* Info area */}
        <div
          className="flex flex-col items-center gap-1.5 px-3 py-3 text-center"
          style={{ borderTop: "1px solid var(--brand-amethyst)" }}
        >
          <p
            className="text-[9px] uppercase tracking-[0.18em] font-body leading-none"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            Gothic Gym Wear
          </p>

          <h3
            className="font-heading text-[11px] leading-snug line-clamp-2"
            style={{ color: "var(--brand-ghost-white)" }}
            data-testid="product-title"
          >
            {product.title}
          </h3>

          <div
            className="w-6 h-px mx-auto"
            style={{ background: "var(--brand-amethyst)" }}
          />

          {cheapestPrice && (
            <div
              className="font-body text-[11px] font-medium"
              style={{ color: "var(--brand-sacred-violet)" }}
            >
              <PreviewPrice price={cheapestPrice} />
            </div>
          )}
        </div>
      </div>
    </LocalizedClientLink>
  )
}
