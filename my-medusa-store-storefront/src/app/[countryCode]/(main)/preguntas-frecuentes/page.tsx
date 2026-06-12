import { Metadata } from "next"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: "Preguntas Frecuentes · Camisetas de Compresión Y2K Fit",
    description:
      "Preguntas frecuentes sobre las camisetas de compresión góticas de Y2K Fit Honduras: tallas, materiales, envíos, devoluciones y más.",
    alternates: { canonical: `/${countryCode}/preguntas-frecuentes` },
    openGraph: {
      title: "Preguntas Frecuentes | Y2K Fit Honduras",
      description:
        "Todo lo que necesitas saber antes de comprar tu camiseta de compresión gótica.",
      type: "website",
      url: `/${countryCode}/preguntas-frecuentes`,
    },
  }
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Las camisetas de compresión sirven para entrenar?",
    a: "Sí. Cada camiseta está diseñada con tela técnica de compresión que mejora el soporte muscular, reduce la fatiga y maneja el sudor. Las usamos para gym, calistenia y entrenamiento funcional.",
  },
  {
    q: "¿Son originales?",
    a: "De momento solo manejamos producto 100% original, siempre manteniendo precios justos",
  },
  {
    q: "¿Qué talla pido?",
    a: "Tenemos una guía de tallas detallada con medidas en cm. Como es ropa de compresión, recomendamos seguir la guía y no pedir talla más grande de lo habitual.",
  },
  {
    q: "¿Cuánto tardan los envíos?",
    a: "entrega inmediata en SPS y alrededores. 1–2 días hábiles a Tegucigalpa. 2–4 días a ciudades intermedias. 3–6 días al resto del país. Detalles en la página de envíos.",
  },
  {
    q: "¿Aceptan cambios?",
    a: "Sí, hacemos cambio de talla dentro de los 7 días posteriores a la entrega si la prenda está sin usar y con etiqueta.",
  },
  {
    q: "¿Por qué tan poco inventario?",
    a: "Nos enfocamos en drops limitados para mantener la exclusividad y el valor de cada pieza.",
  },
  {
    q: "¿Dónde están ubicados?",
    a: "Operamos desde San Pedro sula sin tienda física (de momento), pero con envíos a todo Honduras.",
  },
]

export default function FAQPage() {
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
    <section className="content-container py-20 small:py-28 text-brand-silver-ash">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="mb-12 max-w-3xl">
        <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white">
          Preguntas frecuentes
        </h1>
        <p className="mt-6 text-base small:text-lg leading-relaxed">
          Lo que la gente nos pregunta antes de comprar su primera camiseta de
          compresión gótica.
        </p>
      </header>

      <div className="max-w-3xl flex flex-col gap-8">
        {FAQS.map((f) => (
          <article key={f.q}>
            <h2 className="font-heading uppercase tracking-[0.12em] text-lg small:text-xl text-brand-ghost-white">
              {f.q}
            </h2>
            <p className="mt-3 leading-relaxed">{f.a}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
