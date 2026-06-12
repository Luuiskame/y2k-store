import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: "Envíos a Toda Honduras · Tiempos, Costos y Cobertura",
    description:
      "Envíos de Y2K Fit Honduras a Tegucigalpa, San Pedro Sula y todo el país. Tiempos, costos y cobertura de nuestra paquetería para camisetas de compresión góticas.",
    alternates: { canonical: `/${countryCode}/envios` },
    openGraph: {
      title: "Envíos a Toda Honduras | Y2K Fit Honduras",
      description: "Cobertura, tiempos y costos de envío de Y2K Fit Honduras.",
      type: "website",
      url: `/${countryCode}/envios`,
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Envíos a Toda Honduras | Y2K Fit Honduras",
      description: "Cobertura, tiempos y costos de envío de Y2K Fit Honduras.",
      images: ["/opengraph-image.png"],
    },
  }
}

export default function EnviosPage() {
  return (
    <section className="content-container py-20 small:py-28 text-brand-silver-ash">
      <header className="mb-12 max-w-3xl">
        <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white">
          Envíos a toda Honduras
        </h1>
        <p className="mt-6 text-base small:text-lg leading-relaxed">
          Enviamos tus camisetas de compresión góticas a Tegucigalpa, San Pedro
          Sula, La Ceiba, Choluteca y cualquier rincón del país. Aquí están los
          tiempos, costos y la cobertura.
        </p>
      </header>

      <article className="max-w-3xl flex flex-col gap-10">
        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Tiempos de entrega
          </h2>
          <ul className="mt-4 list-disc list-inside space-y-2 leading-relaxed">
            <li>
              <strong className="text-brand-ghost-white">
                Tegucigalpa y SPS:
              </strong>{" "}
              SPS: entrega inmediata el mismo dia. Tegucigalpa: 2-3 días hábiles.
            </li>
            <li>
              <strong className="text-brand-ghost-white">
                Ciudades intermedias:
              </strong>{" "}
              3–4 días hábiles (La Ceiba, Choluteca, Comayagua, Danlí, Siguatepeque, Choluteca).
            </li>
            <li>
              <strong className="text-brand-ghost-white">Resto del país:</strong>{" "}
              4–6 días hábiles según ubicación.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Costos de envío
          </h2>
          <p className="mt-4 leading-relaxed">
            El costo se calcula automáticamente al ingresar tu dirección
            (Departamento, Colonia y referencias). En drops especiales activamos
            envío gratis a partir de cierto monto — lo verás en el banner
            superior del sitio.
          </p>
        </section>

        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Cobertura
          </h2>
          <p className="mt-4 leading-relaxed">
            Cubrimos los 18 departamentos de Honduras: Francisco Morazán,
            Cortés, Atlántida, Yoro, Comayagua, Choluteca, El Paraíso,
            Olancho, Santa Bárbara, Copán, Lempira, Intibucá, La Paz, Valle,
            Colón, Gracias a Dios, Ocotepeque e Islas de la Bahía.
          </p>
        </section>

        <section>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Cambios y devoluciones
          </h2>
          <p className="mt-4 leading-relaxed">
            Aceptamos cambios de talla dentro de los 7 días posteriores a la
            entrega, siempre que la prenda esté sin usar y con etiqueta.
            Escríbenos por Instagram o WhatsApp para coordinar.
          </p>
        </section>

        <div className="mt-6">
          <LocalizedClientLink href="/store" className="btn-glow">
            Ir a la tienda
          </LocalizedClientLink>
        </div>
      </article>
    </section>
  )
}
