import CollabsTemplate from "@modules/influencers/templates"
import { Metadata } from "next"

/* Matches the product page, so the creator wall and this page refresh from the
   R2 feed in step. */
export const revalidate = 600

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  const title =
    "Colaboraciones · Creadores hondureños que visten Y2K Fit"
  const description =
    "Creadores de contenido en Honduras que ya entrenan con Y2K Fit. Fotos y videos reales de la ropa de compresión gótica puesta."

  return {
    title,
    description,
    alternates: { canonical: `/${countryCode}/colaboraciones` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/${countryCode}/colaboraciones`,
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image.png"],
    },
  }
}

export default function ColaboracionesPage() {
  return <CollabsTemplate />
}
