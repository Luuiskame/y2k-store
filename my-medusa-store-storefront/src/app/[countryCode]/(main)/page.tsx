import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const revalidate = 600

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: {
      absolute: "Y2K Fit Honduras | Ropa Gótica de Compresión y Estilo Y2K",
    },
    description:
      "Tienda hondureña de ropa gótica: camisetas de compresión, estilo Y2K y ropa deportiva oscura inspirada en Breathe Divinity. Envíos a todo Honduras — Tegucigalpa y SPS.",
    alternates: { canonical: `/${countryCode}` },
    openGraph: {
      title: "Y2K Fit Honduras | Ropa Gótica de Compresión y Estilo Y2K",
      description:
        "Ropa gótica y de compresión hecha en Honduras. Estilo Y2K, compresión técnica y estética oscura. Drops limitados.",
      url: `/${countryCode}`,
      type: "website",
    },
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  console.log(collections)

  return (
    <>
      <Hero />
      <div id="featured-collections" className="py-12 scroll-mt-16">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
