import { HttpTypes } from "@medusajs/types"

type StockVariant = Pick<
  HttpTypes.StoreProductVariant,
  "manage_inventory" | "allow_backorder" | "inventory_quantity"
>

type StockProduct = {
  options?: Pick<HttpTypes.StoreProductOption, "id" | "title">[] | null
  variants?:
    | (StockVariant & {
        options?:
          | Pick<HttpTypes.StoreProductOptionValue, "value" | "option_id">[]
          | null
      })[]
    | null
}

export type ProductAvailability = "in_stock" | "sold_out" | "unknown"

export type SizeAvailability = { size: string; inStock: boolean }

/**
 * Same rule as the add-to-cart button (product-actions): a variant can be
 * bought when inventory isn't tracked, when backorders are allowed, or when
 * there is stock. A `null` quantity means the variant has no inventory level
 * at the sales channel's locations, which the button also treats as sold out.
 */
export const isVariantInStock = (variant: StockVariant): boolean =>
  variant.manage_inventory === false ||
  !!variant.allow_backorder ||
  (variant.inventory_quantity ?? 0) > 0

/**
 * Stock can only be judged when the caller asked for it. A list fetched
 * without `+variants.inventory_quantity` returns `undefined` quantities, and
 * reading those as zero would badge the whole grid "Agotado".
 */
const hasStockData = (variant: StockVariant) =>
  variant.manage_inventory === false ||
  !!variant.allow_backorder ||
  variant.inventory_quantity !== undefined

// Sizes are typed by hand in the admin ("s", "XXL"), so they're compared in
// one canonical spelling and ordered by fit, not alphabetically.
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"]

// "Medias" is a typo already present in the admin; accepting it is cheaper
// than a size filter that silently skips those products.
const SIZE_OPTION_TITLE = /^(tallas?|medidas?|medias|sizes?)$/i

export const normalizeSize = (value: string) => {
  const size = value.trim().toUpperCase().replace(/\s+/g, "")

  if (size === "XXL") return "2XL"
  if (size === "XXXL") return "3XL"

  return size
}

export const compareSizes = (a: string, b: string) => {
  const ia = SIZE_ORDER.indexOf(a)
  const ib = SIZE_ORDER.indexOf(b)

  if (ia === -1 && ib === -1) return a.localeCompare(b, "es")
  if (ia === -1) return 1
  if (ib === -1) return -1

  return ia - ib
}

const getSizeOptionId = (product: StockProduct): string | null => {
  const options = product.options ?? []

  // Every garment in the catalog has exactly one option, whatever it's
  // called. The title only matters once a product also varies by color.
  if (options.length === 1) return options[0].id

  return (
    options.find((option) => SIZE_OPTION_TITLE.test(option.title?.trim() ?? ""))
      ?.id ?? null
  )
}

/**
 * Whether the product can be bought at all, plus which sizes are left. Sizes
 * come back empty when stock is `unknown`, so a card never shows a size row
 * it can't back up.
 */
export const getProductStock = (
  product: StockProduct
): { status: ProductAvailability; sizes: SizeAvailability[] } => {
  const variants = product.variants ?? []

  if (!variants.length || !variants.every(hasStockData)) {
    return { status: "unknown", sizes: [] }
  }

  const sizeOptionId = getSizeOptionId(product)
  const bySize = new Map<string, boolean>()

  for (const variant of variants) {
    const values = variant.options ?? []
    const value = sizeOptionId
      ? values.find((v) => v.option_id === sizeOptionId)?.value
      : values.length === 1
        ? values[0].value
        : undefined

    if (!value) continue

    const size = normalizeSize(value)
    bySize.set(size, (bySize.get(size) ?? false) || isVariantInStock(variant))
  }

  const sizes = Array.from(bySize, ([size, inStock]) => ({ size, inStock })).sort(
    (a, b) => compareSizes(a.size, b.size)
  )

  return {
    status: variants.some(isVariantInStock) ? "in_stock" : "sold_out",
    sizes,
  }
}
