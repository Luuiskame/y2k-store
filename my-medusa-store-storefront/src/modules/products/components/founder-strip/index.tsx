import {
  BRAND,
  socialUrls,
  whatsappLink,
} from "@lib/config/brand"
import { getBaseURL } from "@lib/util/env"
import Image from "next/image"

// Placeholder avatar. Replace the <PlaceholderAvatar /> below with an
// <Image src="/founder.jpg" ... /> once the real photo lands in /public.
const PlaceholderAvatar = () => (
  <div
    className="relative h-16 w-16 small:h-20 small:w-20 rounded-full overflow-hidden shrink-0"
    style={{
      background:
        "radial-gradient(circle at 30% 30%, var(--brand-amethyst) 0%, var(--brand-void-black) 75%)",
      border: "1px solid var(--brand-sacred-violet)",
      boxShadow: "0 0 14px rgba(155, 77, 202, 0.35)",
    }}
    aria-hidden
  >
    <span
      className="absolute inset-0 flex items-center justify-center font-heading uppercase tracking-[0.18em] text-brand-ghost-white/80"
      style={{ fontSize: "1.4rem" }}
    >
      {BRAND.founderName.slice(0, 1)}
    </span>
  </div>
)

type FounderStripProps = {
  productTitle?: string
  productHandle?: string
  countryCode?: string
}

const FounderStrip = ({
  productTitle,
  productHandle,
  countryCode,
}: FounderStripProps) => {
  const productLine =
    productHandle && countryCode
      ? ` sobre "${productTitle}": ${getBaseURL()}/${countryCode}/products/${productHandle}`
      : " sobre un producto de Y2K Fit."

  const message = `Hola ${BRAND.founderName}, tengo una pregunta${productLine}`

  return (
    <section
      id="founder"
      aria-label="Sobre la marca"
      className="content-container pb-6 small:pb-10"
    >
      <div
        className="surface-card flex flex-col small:flex-row small:items-center gap-6 small:gap-8 p-6 small:p-8"
        style={{
          borderColor: "var(--brand-amethyst)",
        }}
      >
        <div className="flex items-center gap-5 min-w-0">
          <Image
            src="/founder.jpg"
            alt={`${BRAND.founderName}, ${BRAND.founderRole} de Y2K Fit`}
            width={80}
            height={80}
            className="rounded-full shrink-0 rotate"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm leading-relaxed text-brand-ghost-white/90">
              “{BRAND.founderQuote}”
            </p>
            <span className="font-heading uppercase tracking-[0.18em] text-[11px] text-brand-silver-ash">
              — {BRAND.founderName}, {BRAND.founderRole}
            </span>
          </div>
        </div>

        <div className="flex flex-col xsmall:flex-row gap-3 small:ml-auto shrink-0">
          <a
            href={whatsappLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-rounded px-5 py-3 text-sm transition-colors"
            style={{
              background: "var(--brand-void-black)",
              border: "1px solid var(--brand-amethyst)",
              color: "var(--brand-ghost-white)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="#25D366"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
              className="shrink-0"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
            </svg>
            Hablar por WhatsApp
          </a>
          <a
            href={socialUrls.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-rounded px-5 py-3 text-sm transition-colors hover:text-brand-ghost-white"
            style={{
              border: "1px solid var(--brand-amethyst)",
              color: "var(--brand-silver-ash)",
            }}
          >
            @{BRAND.instagramHandle} en IG
          </a>
        </div>
      </div>
    </section>
  )
}

export default FounderStrip
