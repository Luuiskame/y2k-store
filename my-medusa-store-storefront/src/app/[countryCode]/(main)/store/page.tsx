import { Metadata } from "next"

import { parseSort } from "@lib/util/catalog"
import StoreTemplate from "@modules/store/templates"

export const revalidate = 600

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: "Tienda de Ropa Y2K y Gótica en Honduras",
    description:
      "Explora toda la tienda Y2K Fit Honduras: ropa gótica, camisetas de compresión y ropa deportiva oscura, drops limitados. Compra online con envío a todo Honduras.",
    alternates: { canonical: `/${countryCode}/store` },
    openGraph: {
      title: "Tienda de Ropa Y2K y Gótica en Honduras | Y2K Fit",
      description:
        "Camisetas de compresión, ropa deportiva gótica y drops limitados. Envíos a toda Honduras.",
      url: `/${countryCode}/store`,
      type: "website",
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Tienda de Ropa Y2K y Gótica en Honduras | Y2K Fit",
      description:
        "Camisetas de compresión, ropa deportiva gótica y drops limitados. Envíos a toda Honduras.",
      images: ["/opengraph-image.png"],
    },
  }
}

type Params = {
  // Filters, search and paging are read in the browser (CatalogBrowser);
  // the server only needs the order, to know which cards load first.
  searchParams: Promise<{
    sortBy?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const { sortBy } = await props.searchParams

  return (
    <StoreTemplate sortBy={parseSort(sortBy)} countryCode={params.countryCode} />
  )
}
