import { HttpTypes } from "@medusajs/types"

import {
  isHighElasticity,
  isMediumMuscleFit,
  isPremiumQuality,
  isTightCompression,
} from "./product-tags"
import type { GarmentLine } from "./size-guide"

type ProfiledProduct = Pick<HttpTypes.StoreProduct, "tags" | "title"> & {
  collection?: Pick<HttpTypes.StoreCollection, "title" | "handle"> | null
}

const fold = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

const JOGGER = /\b(joggers?|buzos?)\b/

/**
 * Joggers carry no fit tag, only the quality one, and the product page does
 * not load categories — so the name and collection ("Jogger Breathe divinity…",
 * "Joggers o Buzos Y2k estilo gótico") are what tell them apart.
 */
const isJogger = (product: ProfiledProduct): boolean =>
  JOGGER.test(
    fold(
      [product.title, product.collection?.title, product.collection?.handle]
        .filter(Boolean)
        .join(" ")
    )
  )

/**
 * Which sizing rule a product follows, from what the admin already records.
 * The garment type comes first (a jogger is baggy whatever else it is tagged),
 * then the important warning (tight compression), and only then the standard
 * cut — which needs both of its tags and must not be premium.
 *
 * `null` means "no rule known": the product shows no fit advice and gets the
 * generic size table.
 */
export const getFitProfile = (
  product: ProfiledProduct | null | undefined
): GarmentLine | null => {
  if (!product) return null

  if (isJogger(product)) return "jogger"
  if (isTightCompression(product)) return "premium"

  if (
    isMediumMuscleFit(product) &&
    isHighElasticity(product) &&
    !isPremiumQuality(product)
  ) {
    return "estandar"
  }

  return null
}
