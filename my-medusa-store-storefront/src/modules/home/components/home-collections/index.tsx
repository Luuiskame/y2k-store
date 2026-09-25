import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCarousel from "@modules/home/components/product-carousel"
import { ReactNode } from "react"

export type HomeCollectionItem = {
  id: string
  card: ReactNode
}

export type HomeCollection = {
  id: string
  title: string
  handle: string
  items: HomeCollectionItem[]
}

// One row of four on desktop; a longer swipe on a phone, where going
// sideways costs nothing.
const DESKTOP_LIMIT = 4
const MOBILE_LIMIT = 8

// One button style for the whole section: the store button and each rail's
// "Ver todo". No `clx` here: this is a server component, and importing from
// "@medusajs/ui" in one drags the whole library into the client bundle (see
// TrustStrip).
const PILL =
  "inline-flex min-h-[44px] items-center gap-x-1.5 whitespace-nowrap rounded-full border border-brand-amethyst bg-brand-abyss-purple font-heading text-[11px] uppercase tracking-[0.16em] text-brand-ghost-white transition-all duration-200 ease-in hover:border-brand-sacred-violet hover:shadow-[0_0_20px_rgba(155,77,202,0.35)] small:text-xs"

/**
 * Every collection, newest drop first, one rail each. Filters, search and
 * sorting live in the store, one tap away from the button on top.
 */
export default function HomeCollections({
  collections,
}: {
  collections: HomeCollection[]
}) {
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

        <div className="mt-5 flex justify-center">
          <LocalizedClientLink
            href="/store"
            className={`${PILL} px-6`}
            data-testid="home-view-store"
          >
            Ver toda la tienda
            <span aria-hidden className="text-brand-sacred-violet">
              →
            </span>
          </LocalizedClientLink>
        </div>
      </div>

      <ul className="flex flex-col">
        {collections.map((collection) => (
          <li key={collection.id}>
            <CollectionRail collection={collection} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function CollectionRail({ collection }: { collection: HomeCollection }) {
  const shown = collection.items.slice(0, MOBILE_LIMIT)
  const href = `/collections/${collection.handle}`

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
