import LocalizedClientLink from "@modules/common/components/localized-client-link"

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Puedo pagar contra entrega?",
    a: "Sí, en Tegucigalpa y SPS pagas cuando recibes el pedido en la puerta. Para el resto del país coordinamos por WhatsApp.",
  },
  {
    q: "¿Cuánto demora el envío a mi ciudad?",
    a: "Entrega inmediata en SPS y alrededores, 1–2 días hábiles a Tegucigalpa, 2–4 días a ciudades intermedias y 3–6 días al resto del país.",
  },
  {
    q: "¿Y si la talla no me queda?",
    a: "Cambio de talla gratis dentro de los 7 días posteriores a la entrega. La prenda debe estar sin usar y con etiqueta. Nosotros pagamos el reenvío.",
  },
  {
    q: "¿Cómo la lavo para que dure?",
    a: "Lavado a máquina con agua fría, ciclo suave y al revés. No usar suavizante ni secadora. La compresión y el color se conservan así por años.",
  },
]

const ProductFAQ = () => {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <section
      aria-label="Preguntas frecuentes"
      className="content-container pb-16 small:pb-20"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Antes de comprar
          </h2>
          <LocalizedClientLink
            href="/preguntas-frecuentes"
            className="font-heading uppercase tracking-[0.18em] text-[11px] text-brand-silver-ash hover:text-brand-ghost-white underline-offset-4 hover:underline"
          >
            Ver todas las preguntas →
          </LocalizedClientLink>
        </header>

        <dl className="flex flex-col gap-5">
          {FAQS.map((f) => (
            <div
              key={f.q}
              className="border-b border-[var(--brand-amethyst)]/40 pb-5 last:border-b-0 last:pb-0"
            >
              <dt className="font-heading uppercase tracking-[0.12em] text-sm small:text-base text-brand-ghost-white">
                {f.q}
              </dt>
              <dd className="mt-2 text-sm text-brand-silver-ash leading-relaxed">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export default ProductFAQ
