import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: "Sobre Nosotros · La Primera Marca Gótica de Compresión en Honduras",
    description:
      "Y2K Fit Honduras es la primera marca hondureña de camisetas de compresión con estética gótica. Inspirados en Breathe Divinity y Midnight Studios, hechos para los que entrenan distinto.",
    alternates: { canonical: `/${countryCode}/sobre-nosotros` },
    openGraph: {
      title: "Sobre Y2K Fit Honduras · Compresión Gótica Hecha en Honduras",
      description:
        "Conoce la historia detrás de Y2K Fit Honduras — la primera marca local de ropa deportiva gótica.",
      type: "website",
      url: `/${countryCode}/sobre-nosotros`,
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Sobre Y2K Fit Honduras · Compresión Gótica Hecha en Honduras",
      description:
        "Conoce la historia detrás de Y2K Fit Honduras — la primera marca local de ropa deportiva gótica.",
      images: ["/opengraph-image.png"],
    },
  }
}

export default function SobreNosotrosPage() {
  return (
    <section className="content-container py-20 small:py-28 text-brand-silver-ash">
      <header className="mb-12 max-w-3xl">
        <span className="badge-glow tracking-[0.25em] text-[10px] small:text-xs">
          SOBRE NOSOTROS
        </span>
        <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white mt-6">
          La primera tienda de estilo gótico de compresión en Honduras
        </h1>
        <p className="mt-6 text-base small:text-lg leading-relaxed">
          Y2K Fit Honduras nace para llenar un vacío: en Centroamérica nadie
          estaba haciendo ropa de gym con estética oscura y gotica. Los que querían algo como Breathe Divinity o Midnight
          Studios tenían que pagar envío internacional y esperar semanas. Hoy
          ya no.
        </p>
      </header>

      <article className="max-w-3xl flex flex-col gap-10">
        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Qué hacemos
          </h2>
          <p className="mt-4 leading-relaxed">
            Les traemos camisetas de compresión con identidad
            gótica. Cada prenda combina performance real — tela técnica de alta densidad con grabados en alta calidad, ajuste
            de compresión, costuras planas — con simbolismo oscuro
          </p>
        </section>

        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Para quién es Y2K Fit
          </h2>
          <p className="mt-4 leading-relaxed">
            Si entrenas distinto, si la ropa de gym genérica no te representa,
            si te llama la estética de Breathe Divinity y quieres apoyar a una tienda local, esto es para vos. Nuestra audiencia tiene entre 17 y
            28 años, vive entre Tegucigalpa, San Pedro Sula y el resto del
            país, y quiere ropa que sea distinta, no uniforme.
          </p>
        </section>

        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Drops limitados, no fast fashion
          </h2>
          <p className="mt-4 leading-relaxed">
            Trabajamos por drops. Cada colección es traida en cantidades limitadas, con diseños únicos y sin reposiciones. Esto nos permite mantener la exclusividad, y mantener a nuestros compradores con ropa que casi no se ve en el pais.
          </p>
        </section>

        <div className="mt-6">
          <LocalizedClientLink href="/store" className="btn-glow">
            Ver el drop actual
          </LocalizedClientLink>
        </div>
      </article>
    </section>
  )
}
