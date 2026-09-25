import {
  listCatalogCollections,
  listCatalogProducts,
  listCategoryIndex,
  toCatalogEntry,
} from "@lib/data/catalog"
import { getRegion } from "@lib/data/regions"
import { SortOptions, sortEntries } from "@lib/util/catalog"
import { compareSizes } from "@lib/util/product-availability"
import ProductPreview from "@modules/products/components/product-preview"
import CatalogBrowser, {
  CatalogItem,
} from "@modules/store/components/catalog-browser"

type StoreCatalogProps = {
  countryCode: string
  /** Narrow the listing to one collection… */
  collectionId?: string
  /** …or to a category, subcategories included. */
  categoryId?: string
  /** Off on category pages, where the page itself is the filter. */
  categoryFilter?: boolean
  searchable?: boolean
  /** Server-side order, only used to pick which cards load eagerly. */
  sort: SortOptions
}

// Two cards fill the first screen of a phone; preloading them is the LCP.
const EAGER_CARDS = 2

export default async function StoreCatalog({
  countryCode,
  collectionId,
  categoryId,
  categoryFilter = true,
  searchable = false,
  sort,
}: StoreCatalogProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const [products, categories, collections] = await Promise.all([
    listCatalogProducts(region.id),
    listCategoryIndex(),
    listCatalogCollections(),
  ])

  const collectionTitles = new Map<string, string>(
    collections.map((collection) => [collection.id, collection.title])
  )

  const entries = products
    .map((product) => ({
      ...toCatalogEntry(product, { categories, collectionTitles }),
      product,
    }))
    .filter(
      (entry) =>
        (!collectionId || entry.product.collection_id === collectionId) &&
        (!categoryId || entry.categoryIds.includes(categoryId))
    )

  const items: CatalogItem[] = sortEntries(entries, sort).map(
    ({ product, ...entry }, index) => ({
      ...entry,
      card: (
        <ProductPreview
          product={product}
          region={region}
          priority={index < EAGER_CARDS}
        />
      ),
    })
  )

  // Only categories that would return something: a chip that leads to an
  // empty grid costs more trust than the shortcut earns.
  const chips = categoryFilter
    ? categories.topLevel
        .filter((category) =>
          items.some((item) => item.categoryIds.includes(category.id))
        )
        .map(({ id, name, handle }) => ({ id, name, handle }))
    : []

  const sizes = Array.from(
    new Set(items.flatMap((item) => item.sizesInStock))
  ).sort(compareSizes)

  return (
    <CatalogBrowser
      items={items}
      categories={chips}
      sizes={sizes}
      searchable={searchable}
    />
  )
}
