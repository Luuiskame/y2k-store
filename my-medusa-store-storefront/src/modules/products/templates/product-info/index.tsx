import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

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

const ProductInfo = ({ product }: ProductInfoProps) => {
  const benefits = parseBenefits(product.description)
  const showAsList = benefits.length > 1

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
                className="mt-0.5 text-base leading-none"
                style={{
                  color: "var(--brand-sacred-violet)",
                  textShadow: "0 0 8px rgba(155, 77, 202, 0.45)",
                }}
              >
                ✦
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
