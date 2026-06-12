import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: "Guía de Tallas · Camisetas de Compresión Y2K Fit Honduras",
    description:
      "Guía de tallas para camisetas de compresión góticas Y2K Fit Honduras. Medidas en cm para que tu ropa de compresión te quede como debe.",
    alternates: { canonical: `/${countryCode}/guia-de-tallas` },
    openGraph: {
      title: "Guía de Tallas | Y2K Fit Honduras",
      description:
        "Cómo medirte para elegir la talla correcta en compresión gótica.",
      type: "website",
      url: `/${countryCode}/guia-de-tallas`,
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Guía de Tallas | Y2K Fit Honduras",
      description:
        "Cómo medirte para elegir la talla correcta en compresión gótica.",
      images: ["/opengraph-image.png"],
    },
  }
}

const TALLAS = [
  { talla: "S", pecho: "88 – 94", largo: "68", altura: "1.60 – 1.70 m" },
  { talla: "M", pecho: "95 – 101", largo: "70", altura: "1.68 – 1.75 m" },
  { talla: "L", pecho: "102 – 108", largo: "72", altura: "1.73 – 1.80 m" },
  { talla: "XL", pecho: "109 – 116", largo: "74", altura: "1.78 – 1.88 m" },
]

export default function GuiaTallasPage() {
  return (
    <section className="content-container py-20 small:py-28 text-brand-silver-ash">
      <header className="mb-12 max-w-3xl">
        <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white">
          Guía de tallas
        </h1>
        <p className="mt-6 text-base small:text-lg leading-relaxed">
          La compresión solo funciona si la talla es la correcta. Aquí están
          las medidas que usamos en Y2K Fit Honduras para todas las camisetas
          de compresión.
        </p>
      </header>

      <article className="max-w-3xl flex flex-col gap-10">
        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Cómo medirte
          </h2>
          <ol className="mt-4 list-decimal list-inside space-y-2 leading-relaxed">
            <li>
              <strong className="text-brand-ghost-white">Pecho:</strong> mide
              alrededor de la parte más ancha del pecho, manteniendo la cinta
              horizontal y los brazos relajados.
            </li>
            <li>
              <strong className="text-brand-ghost-white">Largo:</strong> desde
              la base del cuello hasta donde quieres que termine la camiseta.
            </li>
            <li>
              Compara tus medidas con la tabla. Si estás entre dos tallas,
              elige la menor — la compresión está diseñada para ajustarse.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Tabla de medidas (cm)
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-amethyst/60">
                  <th className="py-3 pr-4 text-brand-ghost-white font-heading uppercase tracking-widest text-sm">
                    Talla
                  </th>
                  <th className="py-3 pr-4 text-brand-ghost-white font-heading uppercase tracking-widest text-sm">
                    Pecho
                  </th>
                  <th className="py-3 pr-4 text-brand-ghost-white font-heading uppercase tracking-widest text-sm">
                    Largo
                  </th>
                  <th className="py-3 text-brand-ghost-white font-heading uppercase tracking-widest text-sm">
                    Altura ref.
                  </th>
                </tr>
              </thead>
              <tbody>
                {TALLAS.map((t) => (
                  <tr
                    key={t.talla}
                    className="border-b border-brand-amethyst/30"
                  >
                    <td className="py-3 pr-4 font-heading text-brand-ghost-white">
                      {t.talla}
                    </td>
                    <td className="py-3 pr-4">{t.pecho} cm</td>
                    <td className="py-3 pr-4">{t.largo} cm</td>
                    <td className="py-3">{t.altura}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-brand-silver-ash/70">
            Las medidas pueden variar ±1 cm por proceso de confección.
          </p>
        </section>

        <div className="mt-6">
          <LocalizedClientLink href="/store" className="btn-glow">
            Elegir tu camiseta
          </LocalizedClientLink>
        </div>
      </article>
    </section>
  )
}
