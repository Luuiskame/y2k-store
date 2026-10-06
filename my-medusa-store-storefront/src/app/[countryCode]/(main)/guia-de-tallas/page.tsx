import { Metadata } from "next"

import SizeGuideTemplate from "@modules/size-guide/templates"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return {
    title: "Guía de Tallas: Compresión y Joggers",
    description:
      "Encuentra tu talla en camisetas de compresión estándar y premium y en joggers baggy: calculadora, medidas en cm y pulgadas y cómo medirte. Envíos a todo Honduras.",
    alternates: { canonical: `/${countryCode}/guia-de-tallas` },
    openGraph: {
      title: "Guía de Tallas | Y2K Fit Honduras",
      description:
        "Calculadora de talla, medidas y cómo medirte para camisetas de compresión y joggers baggy.",
      type: "website",
      url: `/${countryCode}/guia-de-tallas`,
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Guía de Tallas | Y2K Fit Honduras",
      description:
        "Calculadora de talla, medidas y cómo medirte para camisetas de compresión y joggers baggy.",
      images: ["/opengraph-image.png"],
    },
  }
}

export default async function GuiaTallasPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  return <SizeGuideTemplate countryCode={countryCode} />
}
