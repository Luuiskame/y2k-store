import { formatMoney } from "./analytics-format"
import type { CompactProduct } from "./compact"

/** How a product's sizes are read at a glance. Pure. */

/** At or under this many left, a size counts as running out. */
export const LOW_STOCK = 2

/** "L 450.00", or "L 450.00 – L 520.00" when its sizes are priced apart. */
export const priceRange = (
  product: Pick<CompactProduct, "variants">,
  currency: string
): string => {
  const prices = product.variants
    .map((variant) => variant.price)
    .filter((price): price is number => price !== null)
  if (prices.length === 0) {
    return "Sin precio"
  }
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  return low === high
    ? formatMoney(low, currency)
    : `${formatMoney(low, currency)} – ${formatMoney(high, currency)}`
}

/** Units of a product that can still be sold; null when none is tracked. */
export const totalAvailable = (
  product: Pick<CompactProduct, "variants">
): number | null => {
  const tracked = product.variants.filter((variant) => variant.available !== null)
  return tracked.length === 0
    ? null
    : tracked.reduce((sum, variant) => sum + (variant.available ?? 0), 0)
}

export type StockLevel = "untracked" | "out" | "low" | "ok"

export const stockLevel = (available: number | null): StockLevel => {
  if (available === null) {
    return "untracked"
  }
  if (available <= 0) {
    return "out"
  }
  return available <= LOW_STOCK ? "low" : "ok"
}
