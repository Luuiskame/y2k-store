import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

export const revalidate = 600

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
  return product.images!.filter((i) => imageIdsMap.has(i.id))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  const cleanDescription =
    product.description?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${product.title} — camiseta de compresión gótica de Y2K Fit Honduras. Activewear oscuro inspirado en Breathe Divinity. Envíos a toda Honduras.`

  return {
    title: `${product.title} · Camiseta de Compresión Gótica`,
    description: cleanDescription,
    alternates: { canonical: `/products/${handle}` },
    openGraph: {
      title: `${product.title} | Y2K Fit Honduras`,
      description: cleanDescription,
      type: "website",
      url: `/products/${handle}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | Y2K Fit Honduras`,
      description: cleanDescription,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  if (!pricedProduct) {
    notFound()
  }

  const cheapestVariant = pricedProduct.variants
    ?.map((v: any) => v.calculated_price)
    .filter((p: any) => p?.calculated_amount != null)
    .sort(
      (a: any, b: any) => a.calculated_amount - b.calculated_amount
    )[0]

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pricedProduct.title,
    description:
      pricedProduct.description ||
      `${pricedProduct.title} — camiseta de compresión gótica de Y2K Fit Honduras.`,
    image: (pricedProduct.images || []).map((i: any) => i.url).filter(Boolean),
    sku: pricedProduct.variants?.[0]?.sku ?? undefined,
    brand: { "@type": "Brand", name: "Y2K Fit Honduras" },
    category: "Apparel > Activewear > Compression Shirts",
    offers: cheapestVariant
      ? {
          "@type": "Offer",
          price: cheapestVariant.calculated_amount,
          priceCurrency:
            cheapestVariant.currency_code?.toUpperCase() ||
            region.currency_code?.toUpperCase(),
          availability: "https://schema.org/InStock",
          url: `/products/${params.handle}`,
        }
      : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images}
      />
    </>
  )
}
