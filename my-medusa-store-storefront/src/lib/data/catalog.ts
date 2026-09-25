import "server-only"

import { HttpTypes } from "@medusajs/types"
import { CatalogEntry, tokenize } from "@lib/util/catalog"
import { getProductStock } from "@lib/util/product-availability"
import { isBestSeller } from "@lib/util/product-tags"

import { listCategories } from "./categories"
import { listCollections } from "./collections"
import { listProducts } from "./products"

/**
 * Exactly what a product card and the catalog filters read. The storefront's
 * default field set weighs ~4x more for the same 33 products (476 KB vs
 * 119 KB), and this list is fetched whole on every listing page.
 * `tags` and `categories` are relations, so they are asked for by field.
 */
const CATALOG_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "created_at",
  "collection_id",
  "categories.id",
  "tags.value",
  "options.id",
  "options.title",
  "variants.id",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "+variants.inventory_quantity",
  "variants.options.value",
  "variants.options.option_id",
  "*variants.calculated_price",
].join(",")

const PAGE_SIZE = 100
// A ceiling, not a target: 500 products is well past what fits a listing
// rendered in one go, and it keeps a bad `count` from looping forever.
const MAX_PAGES = 5

/**
 * The whole published catalog, newest first. Home, store, category and
 * collection pages all read this one list — same URL, same cache entry — and
 * narrow it in memory, so a filter or a new listing page never costs another
 * backend call.
 */
export const listCatalogProducts = async (
  regionId: string
): Promise<HttpTypes.StoreProduct[]> => {
  const products: HttpTypes.StoreProduct[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { response, nextPage } = await listProducts({
      pageParam: page,
      regionId,
      queryParams: {
        limit: PAGE_SIZE,
        order: "-created_at",
        fields: CATALOG_FIELDS,
      },
    })

    products.push(...response.products)

    if (!nextPage) break
  }

  return products
}

/** `created_at` is included so the home can put the newest drop first. */
export const listCatalogCollections = () =>
  listCollections({ fields: "id,handle,title,created_at" }).then(
    ({ collections }) => collections
  )

export type CategoryIndex = {
  /** Top-level categories in the order set in the admin. */
  topLevel: HttpTypes.StoreProductCategory[]
  names: Map<string, string>
  /** Category id → itself plus every ancestor, closest first. */
  lineage: Map<string, string[]>
}

export const listCategoryIndex = async (): Promise<CategoryIndex> => {
  const categories =
    (await listCategories({
      fields: "id,name,handle,parent_category_id,rank",
    })) ?? []

  const byId = new Map<string, HttpTypes.StoreProductCategory>(
    categories.map((category) => [category.id, category])
  )
  const lineage = new Map<string, string[]>()

  for (const category of categories) {
    const chain: string[] = []
    let current: HttpTypes.StoreProductCategory | undefined = category

    // `includes` guards against a parent cycle saved by mistake
    while (current && !chain.includes(current.id)) {
      chain.push(current.id)
      current = current.parent_category_id
        ? byId.get(current.parent_category_id)
        : undefined
    }

    lineage.set(category.id, chain)
  }

  return {
    topLevel: categories
      .filter((category) => !category.parent_category_id)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    names: new Map<string, string>(
      categories.map((category) => [category.id, category.name])
    ),
    lineage,
  }
}

export const toCatalogEntry = (
  product: HttpTypes.StoreProduct,
  {
    categories,
    collectionTitles,
  }: { categories: CategoryIndex; collectionTitles: Map<string, string> }
): CatalogEntry => {
  const { status, sizes } = getProductStock(product)

  // A product filed under a subcategory still belongs to its parent's chip.
  const categoryIds = Array.from(
    new Set(
      (product.categories ?? []).flatMap(
        (category) => categories.lineage.get(category.id) ?? [category.id]
      )
    )
  )

  const prices = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")

  const searchable = [
    product.title,
    product.collection_id ? collectionTitles.get(product.collection_id) : "",
    ...categoryIds.map((id) => categories.names.get(id) ?? ""),
    ...(product.tags ?? []).map((tag) => tag.value),
  ]

  return {
    id: product.id,
    createdAt: product.created_at ? Date.parse(product.created_at) : 0,
    price: prices.length ? Math.min(...prices) : null,
    inStock: status !== "sold_out",
    bestSeller: isBestSeller(product),
    categoryIds,
    sizesInStock: sizes.filter((size) => size.inStock).map((size) => size.size),
    searchText: tokenize(searchable.filter(Boolean).join(" ")).join(" "),
  }
}
