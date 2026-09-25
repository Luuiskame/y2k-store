/**
 * Catalog sorting, filtering and search — pure, so the same code runs on the
 * server (initial order) and in the browser (instant filters with no request).
 */

/**
 * Query keys the listings keep their state in, so a shared link, a reload or
 * the back button from a product restores the same view. One list, because
 * the Meta page-view tracker must know these are in-page state, not pages.
 */
export const CATALOG_PARAMS = {
  category: "categoria",
  size: "talla",
  query: "q",
  sort: "sortBy",
  page: "page",
} as const

export type SortOptions = "created_at" | "best_selling" | "price_asc" | "price_desc"

// `label` is what the native picker lists; `short` is what the closed control
// shows, so it fits beside the result count on a phone.
export const SORT_OPTIONS: { value: SortOptions; label: string; short: string }[] = [
  { value: "created_at", label: "Más recientes", short: "Recientes" },
  { value: "best_selling", label: "Más vendidos", short: "Más vendidos" },
  { value: "price_asc", label: "Precio: menor a mayor", short: "Menor precio" },
  { value: "price_desc", label: "Precio: mayor a menor", short: "Mayor precio" },
]

export const DEFAULT_SORT: SortOptions = "created_at"

export const parseSort = (value: string | null | undefined): SortOptions =>
  SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortOptions)
    : DEFAULT_SORT

/**
 * What the browser needs to know about a product to filter and sort it. The
 * product itself stays on the server; the card arrives already rendered.
 */
export type CatalogEntry = {
  id: string
  createdAt: number
  /** Cheapest variant, the same price the card shows. */
  price: number | null
  /** False only when every variant is known to be sold out. */
  inStock: boolean
  bestSeller: boolean
  /** The product's categories plus their ancestors. */
  categoryIds: string[]
  sizesInStock: string[]
  searchText: string
}

export type CatalogFilters = {
  categoryId: string | null
  size: string | null
  query: string
}

/** Lowercase words without accents: "Gótica" and "gotica" are one search. */
export const tokenize = (value: string): string[] =>
  value
    // "TightCompression" → "Tight Compression", so each word is searchable
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/** One insertion, deletion, substitution or swap of adjacent letters. */
const withinOneEdit = (a: string, b: string): boolean => {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false

  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++

  if (a.length === b.length) {
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
    )
  }

  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a]
  return shorter.slice(i) === longer.slice(i + 1)
}

/**
 * Every query word has to appear. Words of four letters or more also match
 * with one typo, which covers the shopper's typos and the catalog's own
 * ("premiun", "kinght"): a search for "premium" or "knight" still lands.
 */
export const matchesQuery = (searchText: string, query: string): boolean => {
  const tokens = tokenize(query)
  if (!tokens.length) return true

  const words = searchText.split(" ")

  return tokens.every(
    (token) =>
      searchText.includes(token) ||
      (token.length >= 4 &&
        words.some(
          (word) =>
            withinOneEdit(token, word) ||
            // still typing: "fallen kni" should already find "kinght"
            (word.length > token.length &&
              withinOneEdit(token, word.slice(0, token.length)))
        ))
  )
}

/**
 * `ignore` leaves one filter out, which is how each chip gets its count: the
 * size chips count what the other filters leave, whatever size is picked.
 */
export const filterEntries = <T extends CatalogEntry>(
  entries: T[],
  filters: CatalogFilters,
  ignore?: keyof CatalogFilters
): T[] =>
  entries.filter(
    (entry) =>
      (ignore === "categoryId" ||
        !filters.categoryId ||
        entry.categoryIds.includes(filters.categoryId)) &&
      (ignore === "size" ||
        !filters.size ||
        entry.sizesInStock.includes(filters.size)) &&
      (ignore === "query" ||
        !filters.query ||
        matchesQuery(entry.searchText, filters.query))
  )

const newestFirst = (a: CatalogEntry, b: CatalogEntry) => b.createdAt - a.createdAt

// Products without a price in the region go last in both directions.
const byPrice = (a: CatalogEntry, b: CatalogEntry, direction: 1 | -1) => {
  if (a.price === b.price) return newestFirst(a, b)
  if (a.price === null) return 1
  if (b.price === null) return -1
  return (a.price - b.price) * direction
}

const COMPARATORS: Record<
  SortOptions,
  (a: CatalogEntry, b: CatalogEntry) => number
> = {
  created_at: newestFirst,
  best_selling: (a, b) =>
    Number(b.bestSeller) - Number(a.bestSeller) || newestFirst(a, b),
  price_asc: (a, b) => byPrice(a, b, 1),
  price_desc: (a, b) => byPrice(a, b, -1),
}

/**
 * Sold-out products go last whatever the order. They stay listed, since they
 * still show what the brand makes, but a grid that opens on "Agotado" loses
 * the tap before anything buyable gets a chance.
 */
export const sortEntries = <T extends CatalogEntry>(
  entries: T[],
  sort: SortOptions
): T[] => {
  const compare = COMPARATORS[sort]

  return entries
    .slice()
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || compare(a, b))
}
