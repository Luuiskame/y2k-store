import { HttpTypes } from "@medusajs/types"

type TaggableProduct = Pick<HttpTypes.StoreProduct, "tags">

/**
 * Tags are typed by hand in Medusa Admin, so exact casing and spacing are not
 * something we can lean on ("Best sellers" vs "BestSellers"). Normalising to
 * bare lowercase alphanumerics keeps the lookup working if a tag is retyped,
 * and lets us accept the "PremiunQuality" spelling already in the admin
 * alongside the corrected one.
 */
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

const hasAnyTag = (
  product: TaggableProduct | null | undefined,
  ...values: string[]
): boolean => {
  const tags = product?.tags
  if (!tags?.length) return false

  const wanted = new Set(values.map(normalize))
  return tags.some((tag) => tag?.value && wanted.has(normalize(tag.value)))
}

/**
 * Garments cut for compression. Drives the "sube una talla" fit note next to
 * the size selector — the moment the advice is actually actionable.
 */
export const isTightCompression = (
  product: TaggableProduct | null | undefined
): boolean => hasAnyTag(product, "TightCompression")

/** Social proof for the product card badge. */
export const isBestSeller = (
  product: TaggableProduct | null | undefined
): boolean => hasAnyTag(product, "Best sellers", "BestSeller")
