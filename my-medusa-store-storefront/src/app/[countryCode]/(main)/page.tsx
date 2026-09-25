import { Metadata } from "next"

import {
  listCatalogCollections,
  listCatalogProducts,
  listCategoryIndex,
  toCatalogEntry,
} from "@lib/data/catalog"
import { getRegion } from "@lib/data/regions"
import { sortEntries } from "@lib/util/catalog"
import Hero from "@modules/home/components/hero"
import HomeCollections, {
  HomeCollection,
} from "@modules/home/components/home-collections"
import ProductPreview from "@modules/products/components/product-preview"

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

  if (!region) {
    return null
  }

  // The same cached catalog list the store reads, split by collection here —
  // one request for the whole page instead of one per rail.
  const [products, categories, collections] = await Promise.all([
    listCatalogProducts(region.id),
    listCategoryIndex(),
    listCatalogCollections(),
  ])

  const collectionTitles = new Map<string, string>(
    collections.map((collection) => [collection.id, collection.title])
  )

  const entries = products.map((product) => ({
    ...toCatalogEntry(product, { categories, collectionTitles }),
    product,
  }))

  // Newest drop first. Inside each rail, newest product first, with sold-out
  // pieces moved to the end so a rail never opens on "Agotado".
  const rails: HomeCollection[] = collections
    .slice()
    .sort(
      (a, b) =>
        (Date.parse(b.created_at ?? "") || 0) -
        (Date.parse(a.created_at ?? "") || 0)
    )
    .map((collection) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      items: sortEntries(
        entries.filter(
          (entry) => entry.product.collection_id === collection.id
        ),
        "created_at"
      ).map(({ product, id }) => ({
        id,
        card: <ProductPreview product={product} region={region} />,
      })),
    }))
    .filter((rail) => rail.items.length > 0)

  return (
    <>
      <Hero />
      {/* The hero CTA anchors here. Id kept as-is so existing links and
          shares don't break. */}
      <div id="featured-collections" className="scroll-mt-16">
        <HomeCollections collections={rails} />
      </div>
    </>
  )
}
