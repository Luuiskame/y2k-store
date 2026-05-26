import { BRAND, whatsappLink } from "@lib/config/brand"
import Star from "@modules/common/icons/star"

// Frontend-only placeholder. When the reviews backend module ships, replace
// this with the real summary + list fetched server-side. Keep the #reviews
// anchor — the rating row in product-info links to it.
const ReviewsSection = () => {
  const message = `Hola ${BRAND.founderName}, ya compré una camiseta de Y2K Fit y quiero dejar mi reseña.`

  return (
    <section
      id="reviews"
      aria-label="Reseñas"
      className="content-container pb-16 small:pb-20"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Reseñas
          </h2>
          <span
            aria-hidden
            className="font-heading uppercase tracking-[0.18em] text-[11px]"
            style={{ color: "var(--brand-sacred-violet)" }}
          >
            Lote fundador
          </span>
        </header>

        <div
          className="surface-card p-8 small:p-10 flex flex-col items-center text-center gap-4"
          style={{ borderColor: "var(--brand-amethyst)" }}
        >
          <span
            aria-hidden
            style={{
              color: "var(--brand-sacred-violet)",
              filter: "drop-shadow(0 0 10px rgba(155, 77, 202, 0.45))",
            }}
          >
            <Star size="32" />
          </span>
          <p className="text-base small:text-lg text-brand-ghost-white leading-relaxed max-w-md">
            Aún no hay reseñas en esta prenda.
          </p>
          <p className="text-sm text-brand-silver-ash leading-relaxed max-w-md">
            Estamos en lote fundador. Si ya la tienes puesta, mándanos tu opinión
            por WhatsApp y la publicamos aquí con tu nombre y ciudad.
          </p>
          <a
            href={whatsappLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 font-heading uppercase tracking-[0.18em] text-xs text-brand-ghost-white hover:text-brand-divine-lilac transition-colors"
          >
            Enviar mi reseña →
          </a>
        </div>
      </div>
    </section>
  )
}

export default ReviewsSection
