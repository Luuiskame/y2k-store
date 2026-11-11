import { useInfiniteQuery } from "@tanstack/react-query"

import { sdk } from "./client"

/**
 * Data for the phone lists and the product picker. The shapes mirror what
 * `src/api/admin/compact/*` return (see `src/lib/compact.ts`).
 */

export type OrderView = "all" | "unpaid" | "unfulfilled"

export type CompactOrder = {
  id: string
  display_id: number | null
  created_at: string
  status: string
  payment_status: string
  fulfillment_status: string
  total: number
  currency_code: string
  customer_name: string
  phone: string
  country_code: string
  city: string
  province: string
  email: string | null
  item_count: number
  items: {
    title: string
    variant_title: string | null
    quantity: number
    thumbnail: string | null
  }[]
  payment_provider: string | null
  collect_total: number | null
  bac_status: string | null
  manual: boolean
}

export type PendingCounts = {
  proofs_to_review: number
  awaiting_payment: number
  awaiting_amount: number
  to_fulfill: number
}

type OrdersPage = {
  orders: CompactOrder[]
  count: number
  offset: number
  limit: number
  pending: PendingCounts | null
}

export type CompactVariant = {
  id: string
  title: string
  sku: string | null
  price: number | null
  available: number | null
  allow_backorder: boolean
  stock: {
    inventory_item_id: string
    location_id: string
    stocked: number
    reserved: number
  } | null
}

export type CompactProduct = {
  id: string
  title: string
  thumbnail: string | null
  status: string
  variants: CompactVariant[]
}

type ProductsPage = {
  products: CompactProduct[]
  count: number
  currency_code: string | null
}

export const COMPACT_ORDERS_KEY = ["y2k-compact", "orders"]
export const COMPACT_PRODUCTS_KEY = ["y2k-compact", "products"]

const ORDERS_PAGE = 15

/**
 * Orders arrive a few times a day; a minute keeps the list honest. The two
 * filtered views read many more orders per request (the server looks
 * through the recent ones to find the matches), so they refresh less often.
 */
const ORDERS_REFRESH_MS = 60_000
const FILTERED_ORDERS_REFRESH_MS = 180_000

export const useCompactOrders = ({
  view,
  q,
  enabled = true,
}: {
  view: OrderView
  q: string
  enabled?: boolean
}) =>
  useInfiniteQuery({
    queryKey: [...COMPACT_ORDERS_KEY, view, q],
    queryFn: ({ pageParam }) =>
      sdk.client.fetch<OrdersPage>("/admin/compact/orders", {
        query: {
          view,
          limit: ORDERS_PAGE,
          offset: pageParam,
          ...(q ? { q } : {}),
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const loaded = last.offset + last.orders.length
      return loaded < last.count && last.orders.length > 0 ? loaded : undefined
    },
    refetchInterval:
      view === "all" ? ORDERS_REFRESH_MS : FILTERED_ORDERS_REFRESH_MS,
    enabled,
  })

export const useCompactProducts = ({
  q,
  status = "published",
  pageSize = 12,
  enabled = true,
}: {
  q: string
  status?: "published" | "all"
  pageSize?: number
  enabled?: boolean
}) =>
  useInfiniteQuery({
    queryKey: [...COMPACT_PRODUCTS_KEY, status, pageSize, q],
    queryFn: ({ pageParam }) =>
      sdk.client.fetch<ProductsPage>("/admin/compact/products", {
        query: {
          status,
          limit: pageSize,
          offset: pageParam,
          ...(q ? { q } : {}),
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((count, page) => count + page.products.length, 0)
      return loaded < last.count && last.products.length > 0 ? loaded : undefined
    },
    enabled,
  })

/**
 * What to tell the owner when a request fails: the server's own words when
 * it gave any (these routes answer in Spanish), otherwise ours plus the HTTP
 * status. The SDK reports a response with no JSON body by its status text,
 * which is empty over HTTP/2 (Railway), so that case needs the number.
 */
export const errorMessage = (error: unknown, fallback: string): string => {
  const { message, status, statusText } = (error ?? {}) as {
    message?: unknown
    status?: unknown
    statusText?: unknown
  }
  if (typeof message === "string" && message.trim() && message !== statusText) {
    return message
  }
  return typeof status === "number"
    ? `${fallback.replace(/\.$/, "")} (${status}).`
    : fallback
}
