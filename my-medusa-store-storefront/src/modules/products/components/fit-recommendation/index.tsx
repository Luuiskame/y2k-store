import { HttpTypes } from "@medusajs/types"
import { getFitProfile } from "@lib/util/fit-profile"
import { LINES, guideHref } from "@lib/util/size-guide"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type FitRecommendationProps = {
  product: HttpTypes.StoreProduct
}

/**
 * Sizing tip for the standard cut (`MediumMuscleFit` + `HighElasticity`),
 * rendered under the product name where the "be the first to try it" line
 * used to sit.
 *
 * Deliberately quieter than FitNote: that one is a boxed warning because a
 * tight garment ordered in the usual size can be refused at the door, while
 * this is a suggestion — the fabric forgives the neighbouring size — so it is
 * a plain line with a violet rule, no box, no icon.
 */
const FitRecommendation = ({ product }: FitRecommendationProps) => {
  if (getFitProfile(product) !== "estandar") {
    return null
  }

  const line = LINES.estandar

  return (
    <div
      role="note"
      data-testid="fit-recommendation"
      className="flex flex-col gap-1.5 border-l-2 pl-4"
      style={{ borderColor: "var(--brand-sacred-violet)" }}
    >
      <p className="font-heading uppercase tracking-[0.18em] text-[11px] text-brand-silver-ash">
        Recomendación de talla
      </p>
      <p className="text-sm leading-relaxed text-brand-ghost-white/90">
        <strong className="font-semibold text-brand-ghost-white">
          {line.rule}.
        </strong>{" "}
        {line.reason}
      </p>
      <LocalizedClientLink
        href={guideHref("estandar")}
        className="self-start font-heading uppercase tracking-[0.18em] text-[11px] underline underline-offset-4"
        style={{ color: "var(--brand-sacred-violet)" }}
      >
        Ver guía de tallas
      </LocalizedClientLink>
    </div>
  )
}

export default FitRecommendation
