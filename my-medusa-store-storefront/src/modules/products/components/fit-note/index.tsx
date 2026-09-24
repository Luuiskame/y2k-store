import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { isTightCompression } from "@lib/util/product-tags"

type FitNoteProps = {
  product: HttpTypes.StoreProduct
  className?: string
}

/**
 * Sizing advice for compression cuts, rendered against the size selector
 * rather than in the description: the description sits above the price and
 * reads as a benefit list, while this is a warning that only matters at the
 * instant someone picks a size. With pago contra entrega a wrong size is a
 * refused delivery, not a return, so the nudge earns its place.
 *
 * Driven by the `TightCompression` tag — no per-product copy to maintain.
 */
const FitNote = ({ product, className }: FitNoteProps) => {
  if (!isTightCompression(product)) {
    return null
  }

  return (
    <div
      role="note"
      data-testid="fit-note"
      className={clx(
        "flex items-start gap-3 rounded-rounded px-4 py-3",
        className
      )}
      style={{
        backgroundColor: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <span
        aria-hidden
        className="mt-0.5 shrink-0 text-base leading-none"
        style={{ color: "var(--brand-divine-lilac)" }}
      >
        ⚠
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm leading-relaxed text-brand-ghost-white">
          Corte de compresión ajustado.{" "}
          <strong
            className="font-semibold"
            style={{ color: "var(--brand-divine-lilac)" }}
          >
            Te recomendamos una talla más
          </strong>{" "}
          de la que usas normalmente.
        </p>
        <LocalizedClientLink
          href="/guia-de-tallas"
          className="self-start font-heading uppercase tracking-[0.18em] text-[11px] underline underline-offset-4"
          style={{ color: "var(--brand-sacred-violet)" }}
        >
          Ver guía de tallas
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default FitNote
