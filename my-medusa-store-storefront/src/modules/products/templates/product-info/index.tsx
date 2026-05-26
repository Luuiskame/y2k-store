import { HttpTypes } from "@medusajs/types"
import Check from "@modules/common/icons/check"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import RatingStars from "@modules/products/components/rating-stars"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

/**
 * Description format: comma-separated announcements / benefits.
 * Example: "Compresión muscular avanzada, Tela respirable, Costuras planas"
 * → rendered as a benefit list with sacred-violet sigils.
 * If a single block (no commas) we fall back to a paragraph.
 */
const parseBenefits = (raw?: string | null): string[] => {
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

// Reviews are not wired up yet. When the backend ships, swap these two
// placeholders for the real summary fetched alongside the product.
const REVIEW_COUNT = 0
const AVG_RATING = 0
const MIN_REVIEWS_TO_SHOW_STARS = 3

const ProductInfo = ({ product }: ProductInfoProps) => {
  const benefits = parseBenefits(product.description)
  const showAsList = benefits.length > 1
  const hasEnoughReviews = REVIEW_COUNT >= MIN_REVIEWS_TO_SHOW_STARS

  return (
    <div id="product-info" className="flex flex-col gap-y-5">
      {product.collection && (
        <LocalizedClientLink
          href={`/collections/${product.collection.handle}`}
          className="font-heading uppercase tracking-[0.25em] text-xs"
          style={{ color: "var(--brand-sacred-violet)" }}
        >
          {product.collection.title}
        </LocalizedClientLink>
      )}

      <h1
        className="font-heading uppercase tracking-[0.06em] text-3xl small:text-4xl leading-tight text-brand-ghost-white"
        data-testid="product-title"
      >
        {product.title}
      </h1>

      {hasEnoughReviews ? (
        <div className="flex items-center gap-3 text-xs">
          <RatingStars rating={AVG_RATING} />
          <span className="text-brand-ghost-white/90">
            {AVG_RATING.toFixed(1)}
          </span>
          <span className="text-brand-silver-ash">·</span>
          <a
            href="#reviews"
            className="underline-offset-4 hover:underline text-brand-silver-ash"
          >
            {REVIEW_COUNT} reseñas
          </a>
        </div>
      ) : (
        <a
          href="#founder"
          className="inline-flex items-center gap-2 self-start font-heading uppercase tracking-[0.18em] text-[11px] text-brand-silver-ash hover:text-brand-ghost-white transition-colors"
        >
          <span aria-hidden style={{ color: "var(--brand-sacred-violet)" }}>
            ✦
          </span>
          Se de los primeros en probarlo
        </a>
      )}

      {showAsList ? (
        <ul
          className="flex flex-col gap-2.5 mt-1"
          data-testid="product-description"
        >
          {benefits.map((benefit, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm leading-relaxed text-brand-ghost-white/90"
            >
              <span
                aria-hidden
                className="mt-0.5 shrink-0"
                style={{ color: "var(--brand-sacred-violet)" }}
              >
                <Check size="16" />
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="text-sm leading-relaxed text-brand-silver-ash whitespace-pre-line"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}
    </div>
  )
}

export default ProductInfo
