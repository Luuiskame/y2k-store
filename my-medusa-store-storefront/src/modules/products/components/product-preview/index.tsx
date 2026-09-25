import Image from "next/image"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { getProductStock } from "@lib/util/product-availability"
import { isBestSeller } from "@lib/util/product-tags"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
  priority = false,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
  /** First cards of a listing: load eagerly, they are the LCP on a phone. */
  priority?: boolean
}) {
  const { cheapestPrice } = getProductPrice({ product })

  const image = product.thumbnail ?? product.images?.[0]?.url

  // Stock is only judged when the caller fetched it; otherwise status is
  // "unknown" and the card renders exactly as before, with no size row.
  const { status, sizes } = getProductStock(product)
  const soldOut = status === "sold_out"
  const availableSizes = sizes.filter((s) => s.inStock).map((s) => s.size)

  // "Más vendido" is social proof, which is what actually earns a tap on a
  // grid. It sits top-left so it never collides with the "Destacado" badge,
  // and gives way to "Agotado": the one thing a shopper must know first.
  const bestSeller = !soldOut && isBestSeller(product)

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block h-full"
    >
      <div
        data-testid="product-wrapper"
        className="relative flex h-full flex-col overflow-hidden rounded-xl transition-all duration-300 group-hover:glow-lilac"
        style={{
          background: "linear-gradient(180deg, var(--brand-void-black) 0%, var(--brand-abyss-purple) 100%)",
          border: "1px solid var(--brand-amethyst)",
        }}
      >
        {/* Image area */}
        <div className="relative w-full overflow-hidden aspect-[3/4]">
          {image ? (
            <Image
              src={image}
              alt={product.title}
              fill
              priority={priority}
              className={`object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
                soldOut ? "opacity-60" : ""
              }`}
              draggable={false}
              quality={75}
              // Two columns on a phone, three on a small laptop, four above.
              sizes="(max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 340px"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "var(--brand-abyss-purple)" }}
            >
              <PlaceholderImage size={32} />
            </div>
          )}

          {soldOut && (
            <span
              className="absolute top-2 left-2 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]"
              style={{
                background: "var(--brand-void-black)",
                border: "1px solid var(--brand-silver-ash)",
                color: "var(--brand-ghost-white)",
              }}
              data-testid="sold-out-badge"
            >
              Agotado
            </span>
          )}

          {bestSeller && (
            <span
              className="badge-glow absolute top-2 left-2 text-[9px] tracking-[0.12em] px-2 py-0.5"
              data-testid="best-seller-badge"
            >
              Más vendido
            </span>
          )}

          {isFeatured && (
            <span className="badge-glow absolute top-2 right-2 text-[10px]">
              Destacado
            </span>
          )}
        </div>

        {/* Info area */}
        <div
          className="flex flex-1 flex-col items-center gap-1.5 px-3 py-3 text-center"
          style={{ borderTop: "1px solid var(--brand-amethyst)" }}
        >
          {/* Three lines, not two: titles lead with the line name, so the
              color — what tells one shirt from the next — comes last. */}
          <h3
            className="font-heading text-xs small:text-[13px] leading-snug line-clamp-3"
            style={{ color: "var(--brand-ghost-white)" }}
            data-testid="product-title"
          >
            {product.title}
          </h3>

          {/* Pinned to the bottom so prices line up across a grid row. */}
          <div className="mt-auto flex flex-col items-center gap-1.5 pt-1">
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

            {/* Sizes left, on the card: in a small-batch catalog the usual
                reason not to buy is that your size is gone, and this answers
                it before the tap instead of after. */}
            {sizes.length > 0 && (
              <>
                <p className="sr-only">
                  {soldOut
                    ? "Sin tallas disponibles"
                    : `Tallas disponibles: ${availableSizes.join(", ")}`}
                </p>
                <ul
                  aria-hidden
                  className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-body text-[10px] uppercase tracking-[0.06em]"
                  data-testid="product-sizes"
                >
                  {sizes.map(({ size, inStock }) => (
                    <li
                      key={size}
                      className={
                        inStock
                          ? "text-brand-ghost-white"
                          : "text-brand-silver-ash line-through opacity-50"
                      }
                    >
                      {size}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
