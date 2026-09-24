import { Metadata } from "next"

import CategoryPills from "@modules/home/components/category-pills"
import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCategories } from "@lib/data/categories"
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
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Y2K Fit Honduras | Ropa Gótica de Compresión y Estilo Y2K",
      description:
        "Ropa gótica y de compresión hecha en Honduras. Estilo Y2K, compresión técnica y estética oscura. Drops limitados.",
      images: ["/opengraph-image.png"],
    },
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  // One categories fetch feeds both the pill strip and the rails below it, so
  // the two always show the same taxonomy in the same order. Internal
  // categories aren't returned by the store API, so they self-exclude.
  // `products.id` rather than `*products`: we only need to know whether a
  // category is empty, and the id-only projection is ~15x smaller.
  const categories = await listCategories({
    fields: "id,name,handle,parent_category_id,rank,products.id",
  })

  if (!categories || !region) {
    return null
  }

  // Top-level only (children would repeat their parent's products) and never
  // empty — a pill that lands on a page with nothing in it costs more trust
  // than the shortcut earns. `rank` is the order set in the admin.
  const topLevel = categories
    .filter(
      (category) =>
        !category.parent_category_id && (category.products?.length ?? 0) > 0
    )
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

  return (
    <>
      <Hero />
      {/* The hero CTA anchors here: the category chooser is a more useful
          landing spot than the first rail. Id kept as-is so existing links
          and shares don't break. */}
      <div id="featured-collections" className="scroll-mt-16">
        <CategoryPills categories={topLevel} />
      </div>
      <div className="py-12">
        <ul className="flex flex-col">
          <FeaturedProducts categories={topLevel} region={region} />
        </ul>
      </div>
    </>
  )
}
