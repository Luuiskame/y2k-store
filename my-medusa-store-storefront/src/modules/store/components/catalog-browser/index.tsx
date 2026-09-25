"use client"

import {
  ChevronDownMini,
  MagnifyingGlassMini,
  XMarkMini,
} from "@medusajs/icons"
import {
  CATALOG_PARAMS as PARAMS,
  CatalogEntry,
  CatalogFilters,
  DEFAULT_SORT,
  SORT_OPTIONS,
  filterEntries,
  parseSort,
  sortEntries,
} from "@lib/util/catalog"
import { normalizeSize } from "@lib/util/product-availability"
import FilterChip, {
  useRevealPressedChip,
} from "@modules/common/components/filter-chip"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  FormEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export type CatalogItem = CatalogEntry & { card: ReactNode }

export type CatalogCategory = { id: string; name: string; handle: string }

type CatalogBrowserProps = {
  items: CatalogItem[]
  /** One chip each. With fewer than two there is nothing to choose, so no row. */
  categories?: CatalogCategory[]
  /** Sizes with stock somewhere in `items`, in fit order. */
  sizes?: string[]
  searchable?: boolean
  pageSize?: number
}

const SEARCH_DEBOUNCE_MS = 400

/**
 * The listing behind /store, category and collection pages. Every product
 * arrives with its card already rendered on the server, so filtering, sorting
 * and "ver más" happen in memory: no request, no loading state, and the only
 * trace is the URL.
 */
export default function CatalogBrowser({
  items,
  categories = [],
  sizes = [],
  searchable = false,
  pageSize = 24,
}: CatalogBrowserProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const categoryParam = searchParams.get(PARAMS.category)?.toLowerCase()
  const activeCategory =
    categories.find(
      (category) => category.handle.toLowerCase() === categoryParam
    ) ?? null

  const sizeParam = searchParams.get(PARAMS.size)
  const activeSize = sizeParam
    ? sizes.find((size) => size === normalizeSize(sizeParam)) ?? null
    : null

  const sort = parseSort(searchParams.get(PARAMS.sort))
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get(PARAMS.page) ?? "", 10) || 1
  )

  const categoryRowRef = useRef<HTMLDivElement>(null)
  const sizeRowRef = useRef<HTMLDivElement>(null)
  useRevealPressedChip(categoryRowRef, activeCategory?.id)
  useRevealPressedChip(sizeRowRef, activeSize)

  // Results follow every keystroke; the URL catches up after a pause.
  const [query, setQuery] = useState(
    () => searchParams.get(PARAMS.query) ?? ""
  )
  const trimmedQuery = query.trim()

  // `replaceState` instead of the router: Next keeps useSearchParams in sync
  // and no server render runs, so a tap costs a re-render and nothing else.
  const updateParams = useCallback(
    (patch: Record<string, string | null>, keepPage = false) => {
      const params = new URLSearchParams(window.location.search)

      Object.entries(patch).forEach(([key, value]) => {
        if (value) params.set(key, value)
        else params.delete(key)
      })

      if (!keepPage) params.delete(PARAMS.page)

      const search = params.toString()
      window.history.replaceState(
        null,
        "",
        search ? `${pathname}?${search}` : pathname
      )
    },
    [pathname]
  )

  useEffect(() => {
    const current =
      new URLSearchParams(window.location.search).get(PARAMS.query) ?? ""

    if (trimmedQuery === current) return

    const timer = window.setTimeout(
      () => updateParams({ [PARAMS.query]: trimmedQuery || null }),
      SEARCH_DEBOUNCE_MS
    )

    return () => window.clearTimeout(timer)
  }, [trimmedQuery, updateParams])

  const filters: CatalogFilters = useMemo(
    () => ({
      categoryId: activeCategory?.id ?? null,
      size: activeSize,
      query: trimmedQuery,
    }),
    [activeCategory?.id, activeSize, trimmedQuery]
  )

  const results = useMemo(
    () => sortEntries(filterEntries(items, filters), sort),
    [items, filters, sort]
  )

  // Each chip counts what the *other* filters leave, so picking "M" never
  // shows "0" on the size you would switch to.
  const categoryCounts = useMemo(() => {
    const pool = filterEntries(items, filters, "categoryId")
    const counts = new Map<string, number>()

    pool.forEach((entry) =>
      entry.categoryIds.forEach((id) =>
        counts.set(id, (counts.get(id) ?? 0) + 1)
      )
    )

    return { total: pool.length, counts }
  }, [items, filters])

  const sizeCounts = useMemo(() => {
    const counts = new Map<string, number>()

    filterEntries(items, filters, "size").forEach((entry) =>
      entry.sizesInStock.forEach((size) =>
        counts.set(size, (counts.get(size) ?? 0) + 1)
      )
    )

    return counts
  }, [items, filters])

  const visible = results.slice(0, page * pageSize)
  const remaining = results.length - visible.length
  const hasFilters = !!(activeCategory || activeSize || trimmedQuery)

  // Real link for crawlers and no-JS; with JS the click stays in memory.
  const nextPageHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(PARAMS.page, String(page + 1))
    return `${pathname}?${params.toString()}`
  }, [searchParams, pathname, page])

  const selectCategory = (category: CatalogCategory | null) =>
    updateParams({ [PARAMS.category]: category?.handle ?? null })

  const toggleSize = (size: string) =>
    updateParams({ [PARAMS.size]: activeSize === size ? null : size })

  const clearFilters = () => {
    setQuery("")
    updateParams({
      [PARAMS.category]: null,
      [PARAMS.size]: null,
      [PARAMS.query]: null,
    })
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams({ [PARAMS.query]: trimmedQuery || null })
    // Drops the phone keyboard so the results underneath are visible.
    event.currentTarget.querySelector("input")?.blur()
  }

  const showMore = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    updateParams({ [PARAMS.page]: String(page + 1) }, true)
  }

  const showCategories = categories.length > 1
  const currentSort =
    SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0]

  return (
    <div>
      <div className="flex flex-col gap-3 small:gap-4">
        {(showCategories || searchable) && (
          <div className="flex flex-col gap-3 small:flex-row small:items-center small:justify-between small:gap-6">
            {showCategories && (
              <div
                ref={categoryRowRef}
                role="group"
                aria-label="Filtrar por categoría"
                className="-mx-6 flex gap-2 overflow-x-auto px-6 no-scrollbar small:mx-0 small:flex-wrap small:overflow-visible small:px-0"
                data-testid="category-filter"
              >
                <FilterChip
                  active={!activeCategory}
                  count={categoryCounts.total}
                  onClick={() => selectCategory(null)}
                >
                  Todo
                </FilterChip>
                {categories.map((category) => {
                  const count = categoryCounts.counts.get(category.id) ?? 0
                  const active = activeCategory?.id === category.id

                  return (
                    <FilterChip
                      key={category.id}
                      active={active}
                      count={count}
                      disabled={!count && !active}
                      onClick={() => selectCategory(active ? null : category)}
                    >
                      {category.name}
                    </FilterChip>
                  )
                })}
              </div>
            )}

            {searchable && (
              <form
                role="search"
                onSubmit={submitSearch}
                className="relative w-full small:ml-auto small:w-72 small:shrink-0"
              >
                <label htmlFor="catalog-search" className="sr-only">
                  Buscar productos
                </label>
                <MagnifyingGlassMini
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-silver-ash"
                />
                <input
                  id="catalog-search"
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por color o prenda"
                  className="h-11 w-full rounded-full border border-brand-amethyst bg-brand-abyss-purple pl-10 pr-10 text-sm text-brand-ghost-white placeholder:text-brand-silver-ash transition-colors focus:border-brand-sacred-violet focus:outline-none"
                  data-testid="catalog-search"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Borrar búsqueda"
                    className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-brand-silver-ash hover:text-brand-ghost-white"
                  >
                    <XMarkMini />
                  </button>
                )}
              </form>
            )}
          </div>
        )}

        {sizes.length > 0 && (
          <div
            ref={sizeRowRef}
            role="group"
            aria-label="Filtrar por talla"
            className="-mx-6 flex items-center gap-2 overflow-x-auto px-6 no-scrollbar small:mx-0 small:px-0"
            data-testid="size-filter"
          >
            <span
              aria-hidden
              className="mr-1 shrink-0 text-[11px] uppercase tracking-[0.18em] text-brand-silver-ash"
            >
              Talla
            </span>
            {sizes.map((size) => {
              const count = sizeCounts.get(size) ?? 0
              const active = activeSize === size

              return (
                <FilterChip
                  key={size}
                  active={active}
                  disabled={!count && !active}
                  onClick={() => toggleSize(size)}
                  aria-label={`Talla ${size}`}
                  className="min-w-[44px] px-3 font-body tracking-[0.08em]"
                >
                  {size}
                </FilterChip>
              )
            })}
            {/* The size question is the one that stops apparel carts;
                answering it next to the filter keeps the shopper here. */}
            <LocalizedClientLink
              href="/guia-de-tallas"
              className="ml-1 shrink-0 whitespace-nowrap text-xs underline underline-offset-4"
            >
              Guía de tallas
            </LocalizedClientLink>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-brand-amethyst pt-3">
          <div className="flex min-w-0 items-center gap-3">
            <p
              aria-live="polite"
              className="text-[11px] uppercase tracking-[0.18em] text-brand-silver-ash"
              data-testid="results-count"
            >
              {results.length}{" "}
              {results.length === 1 ? "producto" : "productos"}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                aria-label="Limpiar filtros"
                className="min-h-[44px] text-xs text-brand-sacred-violet underline underline-offset-4 transition-colors hover:text-brand-divine-lilac"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* The closed control shows a short label; the native picker (a
              sheet on phones) lists the full ones. The select sits on top,
              invisible, so it still gets the tap and the keyboard. */}
          <label className="relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-brand-amethyst bg-brand-abyss-purple pl-4 pr-3 text-sm text-brand-ghost-white transition-colors focus-within:border-brand-sacred-violet hover:border-brand-sacred-violet">
            <span className="sr-only">Ordenar por</span>
            <span aria-hidden className="hidden text-brand-silver-ash small:inline">
              Ordenar:
            </span>
            <span aria-hidden>{currentSort.short}</span>
            <ChevronDownMini aria-hidden className="text-brand-silver-ash" />
            <select
              data-brand-select
              value={sort}
              onChange={(event) =>
                updateParams({
                  [PARAMS.sort]:
                    event.target.value === DEFAULT_SORT
                      ? null
                      : event.target.value,
                })
              }
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
              data-testid="sort-select"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {results.length > 0 ? (
        <ul
          className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 small:mt-6 small:grid-cols-3 small:gap-x-6 small:gap-y-8 medium:grid-cols-4"
          data-testid="products-list"
        >
          {visible.map((item) => (
            <li key={item.id}>{item.card}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-large border border-dashed border-brand-amethyst px-6 py-14 text-center">
          <p className="font-heading text-lg text-brand-ghost-white">
            {trimmedQuery
              ? `Nada con “${trimmedQuery}”`
              : hasFilters
                ? "No hay prendas con esos filtros"
                : "Todavía no hay prendas aquí"}
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-brand-silver-ash">
            {trimmedQuery
              ? "Revisa cómo lo escribiste o busca por color o tipo de prenda."
              : activeSize
                ? `Ya no quedan prendas en talla ${activeSize} con esta combinación. Prueba otra talla o quita un filtro.`
                : hasFilters
                  ? "Prueba quitando algún filtro."
                  : "Mientras llegan, mira el resto de la tienda."}
          </p>
          {trimmedQuery && showCategories && (
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <FilterChip
                  key={category.id}
                  active={false}
                  onClick={() => {
                    setQuery("")
                    updateParams({
                      [PARAMS.query]: null,
                      [PARAMS.size]: null,
                      [PARAMS.category]: category.handle,
                    })
                  }}
                >
                  {category.name}
                </FilterChip>
              ))}
            </div>
          )}
          {/* An empty category (the footer links every one) has no filter
              to clear, so the way out is the store. */}
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="btn-primary min-h-[44px]"
            >
              Ver todos los productos
            </button>
          ) : (
            <LocalizedClientLink
              href="/store"
              className="btn-primary inline-flex min-h-[44px] items-center"
            >
              Ver toda la tienda
            </LocalizedClientLink>
          )}
        </div>
      )}

      {remaining > 0 && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <p className="text-xs text-brand-silver-ash">
            Has visto {visible.length} de {results.length} productos
          </p>
          <div
            aria-hidden
            className="h-0.5 w-48 overflow-hidden rounded-full bg-brand-abyss-purple"
          >
            <div
              className="h-full bg-brand-sacred-violet transition-[width] duration-300"
              style={{ width: `${(visible.length / results.length) * 100}%` }}
            />
          </div>
          <a
            href={nextPageHref}
            onClick={showMore}
            className="btn-ghost mt-2 inline-flex min-h-[44px] items-center font-heading text-xs uppercase tracking-[0.16em]"
            data-testid="show-more"
          >
            Ver {Math.min(remaining, pageSize)} más
          </a>
        </div>
      )}
    </div>
  )
}
