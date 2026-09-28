import type { RemoteQueryFunction } from "@medusajs/framework/types"

export type ProductCard = { id: string; title: string; thumbnail: string | null }

type Query = Omit<RemoteQueryFunction, symbol>

/** Titles and thumbnails change rarely; the live view asks every few seconds. */
const TTL_MS = 10 * 60 * 1000

/** Past this many handles the cache starts over, so junk handles cannot pile up. */
const MAX_ENTRIES = 1000

const cache = new Map<string, { value: ProductCard | null; expiresAt: number }>()

/**
 * Product title and thumbnail for each handle the traffic counters saw.
 *
 * Cached per process, misses included (a handle with no product, say from a
 * deleted product or a mistyped URL, is remembered as such), so the live view
 * polling every few seconds does not query Postgres once it has seen the
 * catalog.
 */
export const productsByHandle = async (
  query: Query,
  handles: string[]
): Promise<Map<string, ProductCard>> => {
  const now = Date.now()
  const wanted = [...new Set(handles.filter(Boolean))].slice(0, 100)
  const missing = wanted.filter((handle) => {
    const entry = cache.get(handle)
    return !entry || entry.expiresAt <= now
  })

  if (missing.length) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle", "thumbnail"],
      filters: { handle: missing },
    })

    if (cache.size + missing.length > MAX_ENTRIES) {
      cache.clear()
    }

    const found = new Map(data.map((product: any) => [product.handle, product]))
    for (const handle of missing) {
      const product = found.get(handle)
      cache.set(handle, {
        value: product
          ? { id: product.id, title: product.title, thumbnail: product.thumbnail ?? null }
          : null,
        expiresAt: now + TTL_MS,
      })
    }
  }

  const result = new Map<string, ProductCard>()
  for (const handle of wanted) {
    const value = cache.get(handle)?.value
    if (value) {
      result.set(handle, value)
    }
  }
  return result
}
