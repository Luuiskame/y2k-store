import { Metadata } from "next"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export const revalidate = 600

export const metadata: Metadata = {
  title: "Tienda · Camisetas de Compresión y Activewear Gótico",
  description:
    "Explora toda la tienda Y2K Fit Honduras: camisetas de compresión góticas, activewear oscuro y drops limitados. Inspirado en Breathe Divinity, hecho en Honduras.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Tienda Y2K Fit Honduras · Compresión Gótica",
    description:
      "Camisetas de compresión, activewear gótico y drops limitados. Envíos a toda Honduras.",
    url: "/store",
    type: "website",
  },
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page } = searchParams

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
    />
  )
}
