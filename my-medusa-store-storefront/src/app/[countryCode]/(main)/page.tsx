import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const revalidate = 600

export const metadata: Metadata = {
  title:
    "Camisetas de Compresión Góticas en Honduras | Y2K Fit Honduras",
  description:
    "Compra camisetas de compresión con estética gótica en Honduras. Activewear oscuro inspirado en Breathe Divinity — drops limitados, envíos a todo el país. Hecho en Honduras.",
  alternates: { canonical: "/" },
  openGraph: {
    title:
      "Camisetas de Compresión Góticas en Honduras | Y2K Fit Honduras",
    description:
      "Activewear gótico hecho en Honduras. Compresión técnica + estética oscura. Drops limitados.",
    url: "/",
    type: "website",
  },
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
