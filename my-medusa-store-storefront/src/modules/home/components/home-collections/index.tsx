"use client"

import { CATALOG_PARAMS } from "@lib/util/catalog"
import FilterChip, {
  useRevealPressedChip,
} from "@modules/common/components/filter-chip"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCarousel from "@modules/home/components/product-carousel"
import { usePathname, useSearchParams } from "next/navigation"
import { ReactNode, useLayoutEffect, useMemo, useRef } from "react"

export type HomeCategory = {
  id: string
  name: string
  handle: string
  count: number
}

export type HomeCollectionItem = {
  id: string
  categoryIds: string[]
  card: ReactNode
}

export type HomeCollection = {
  id: string
  title: string
  handle: string
  items: HomeCollectionItem[]
}

// Same key the listings read, so the store button keeps the filter.
const PARAM = CATALOG_PARAMS.category

// One row of four on desktop; a longer swipe on a phone, where going
// sideways costs nothing.
const DESKTOP_LIMIT = 4
const MOBILE_LIMIT = 8

// The nav is h-16; the filter bar sticks right under it.
const NAV_HEIGHT = 64

// One button style for the section: the store button and each rail's
// "Ver todo".
const PILL =
  "inline-flex min-h-[44px] items-center gap-x-1.5 whitespace-nowrap rounded-full border border-brand-amethyst bg-brand-abyss-purple font-heading text-[11px] uppercase tracking-[0.16em] text-brand-ghost-white transition-all duration-200 ease-in hover:border-brand-sacred-violet hover:shadow-[0_0_20px_rgba(155,77,202,0.35)] small:text-xs"

/**
 * Every collection, newest drop first, with a category filter that narrows
 * the rails in place instead of sending the shopper to another page. Cards
 * are rendered on the server; filtering only picks which to show, so a tap
 * is instant and never hits the network. The filter is kept in the URL, so
 * coming back from a product lands on the same view.
 */
export default function HomeCollections({
  categories,
  collections,
}: {
  categories: HomeCategory[]
  collections: HomeCollection[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const barAnchorRef = useRef<HTMLDivElement>(null)
  const scrollAfterFilter = useRef(false)
  const chipRowRef = useRef<HTMLDivElement>(null)

  const handle = searchParams.get(PARAM)?.toLowerCase()
  const active =
    categories.find((category) => category.handle.toLowerCase() === handle) ??
    null

  useRevealPressedChip(chipRowRef, active?.id)

  const visible = useMemo(
    () =>
      collections
        .map((collection) => ({
          ...collection,
          items: active
            ? collection.items.filter((item) =>
                item.categoryIds.includes(active.id)
              )
            : collection.items,
        }))
        .filter((collection) => collection.items.length > 0),
    [collections, active]
  )

  const total = visible.reduce(
    (sum, collection) => sum + collection.items.length,
    0
  )

  const select = (category: HomeCategory | null) => {
    if ((category?.id ?? null) === (active?.id ?? null)) return

    const params = new URLSearchParams(window.location.search)

    if (category) params.set(PARAM, category.handle)
    else params.delete(PARAM)

    const search = params.toString()
    // No router round trip: Next syncs useSearchParams from history.
    window.history.replaceState(
      null,
      "",
      search ? `${pathname}?${search}` : pathname
    )

    // Tapped on the stuck bar halfway down the rails: remember it, and jump
    // back to the top of the section once the new rails are laid out.
    const anchorTop = barAnchorRef.current?.getBoundingClientRect().top
    scrollAfterFilter.current = anchorTop !== undefined && anchorTop < NAV_HEIGHT
  }

  // After the commit, before paint. Scrolling from the click handler doesn't
  // work: the rails re-render later, the page gets shorter, and the browser
  // leaves the shopper past the end of it, looking at nothing.
  useLayoutEffect(() => {
    if (!scrollAfterFilter.current) return
    scrollAfterFilter.current = false

    const anchorTop = barAnchorRef.current?.getBoundingClientRect().top

    if (anchorTop !== undefined) {
      window.scrollTo({ top: window.scrollY + anchorTop - NAV_HEIGHT })
    }
  }, [active?.id])

  return (
    <section aria-labelledby="home-collections-title" className="pb-12">
      <div className="content-container pt-10 text-center small:pt-14">
        <h2
          id="home-collections-title"
          className="font-heading text-sm uppercase tracking-[0.22em] text-brand-ghost-white small:text-base"
        >
          Colecciones
        </h2>
        <p className="mt-2 text-xs text-brand-silver-ash small:text-sm">
          Del drop más nuevo al primero.
        </p>
      </div>

      <div ref={barAnchorRef} aria-hidden className="mt-4" />
      {/* Sticky: the rails run long, and switching category shouldn't mean
          scrolling back up to find the chips. The bar background is Void
          Black at 92% — `bg-brand-void-black/92` compiles to nothing, since
          the brand colors are CSS variables. */}
      <div
        className="sticky top-16 z-30"
        style={{
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="content-container py-3">
          <div
            ref={chipRowRef}
            role="group"
            aria-label="Filtrar por categoría"
            className="-mx-6 flex gap-2 overflow-x-auto px-6 no-scrollbar small:mx-0 small:flex-wrap small:justify-center small:overflow-visible small:px-0"
            data-testid="home-category-filter"
          >
            <FilterChip active={!active} onClick={() => select(null)}>
              Todo
            </FilterChip>
            {categories.map((category) => {
              const isActive = active?.id === category.id

              return (
                <FilterChip
                  key={category.id}
                  active={isActive}
                  count={category.count}
                  onClick={() => select(isActive ? null : category)}
                >
                  {category.name}
                </FilterChip>
              )
            })}
          </div>
        </div>
      </div>

      {/* No visible result count, to keep the section quiet; screen readers
          still hear what a chip did. */}
      <p aria-live="polite" className="sr-only">
        {total} {total === 1 ? "prenda" : "prendas"}
        {active ? ` de ${active.name}` : ""} en {visible.length}{" "}
        {visible.length === 1 ? "colección" : "colecciones"}
      </p>

      {/* The flat, sortable grid for whoever wants every match at once. Same
          gap above as between the subtitle and the chips, so it reads as its
          own step and not as a second row of chips. */}
      <div className="content-container mt-4 flex justify-center">
        <LocalizedClientLink
          href={
            active
              ? `/store?${PARAM}=${encodeURIComponent(active.handle)}`
              : "/store"
          }
          className={`${PILL} px-6`}
          data-testid="home-view-store"
        >
          {active ? "Ver todas en la tienda" : "Ver toda la tienda"}
          <span aria-hidden className="text-brand-sacred-violet">
            →
          </span>
        </LocalizedClientLink>
      </div>

      <ul className="flex flex-col">
        {visible.map((collection) => (
          <li key={collection.id}>
            <CollectionRail collection={collection} filter={active} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CollectionRail({
  collection,
  filter,
}: {
  collection: HomeCollection
  filter: HomeCategory | null
}) {
  const shown = collection.items.slice(0, MOBILE_LIMIT)
  // Carry the filter over, so "ver todo" shows the same slice, just complete.
  const href = `/collections/${collection.handle}${
    filter ? `?${PARAM}=${encodeURIComponent(filter.handle)}` : ""
  }`

  return (
    <div className="content-container py-8 small:py-12">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="min-w-0 font-heading text-lg leading-snug text-brand-ghost-white small:text-xl">
          {collection.title}
        </h3>

        <LocalizedClientLink
          href={href}
          className={`${PILL} shrink-0 px-4`}
          data-testid={`view-all-${collection.handle}`}
        >
          Ver todo
          <span aria-hidden className="text-brand-sacred-violet">
            →
          </span>
        </LocalizedClientLink>
      </div>

      <ProductCarousel>
        {shown.map((item, index) => (
          <div
            key={item.id}
            className={`w-[160px] flex-none snap-start small:w-auto ${
              index >= DESKTOP_LIMIT ? "small:hidden" : ""
            }`}
          >
            {item.card}
          </div>
        ))}

        {/* End-of-rail card: catches the phone user who swipes to the end of
            the row, which is exactly when intent peaks. Desktop has the
            header link instead. */}
        {collection.items.length > shown.length && (
          <div className="w-[160px] flex-none snap-start small:hidden">
            <LocalizedClientLink
              href={href}
              className="group flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brand-amethyst px-4 transition-all duration-300"
              style={{
                background:
                  "linear-gradient(180deg, var(--brand-void-black) 0%, var(--brand-abyss-purple) 100%)",
              }}
              aria-label={`Ver toda la colección ${collection.title}`}
            >
              <span
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-violet-deep text-lg text-brand-ghost-white transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
              <span className="text-center font-heading text-[11px] uppercase leading-snug tracking-[0.16em] text-brand-ghost-white">
                Ver todo
              </span>
            </LocalizedClientLink>
          </div>
        )}
      </ProductCarousel>
    </div>
  )
}
