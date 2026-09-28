import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { sdk } from "./client"

/**
 * Data for the Estadísticas page. The shapes mirror what
 * `src/api/admin/analytics/*` return.
 */

export const PRESETS = [
  { value: "today", label: "Hoy", comparison: "vs. ayer a esta hora" },
  { value: "yesterday", label: "Ayer", comparison: "vs. el día anterior" },
  { value: "last_7_days", label: "Últimos 7 días", comparison: "vs. los 7 días anteriores" },
  { value: "last_30_days", label: "Últimos 30 días", comparison: "vs. los 30 días anteriores" },
  { value: "last_90_days", label: "Últimos 90 días", comparison: "vs. los 90 días anteriores" },
  { value: "this_month", label: "Este mes", comparison: "vs. los mismos días del mes pasado" },
  { value: "last_month", label: "Mes pasado", comparison: "vs. el mes anterior" },
  { value: "this_year", label: "Este año", comparison: "vs. los mismos días del año pasado" },
] as const

export type Preset = (typeof PRESETS)[number]["value"]

export type Granularity = "hour" | "day" | "month"

export type RangeInfo = {
  from: string
  to: string
  previous_from: string
  previous_to: string
  granularity: Granularity
  days: number
}

type SeriesOf<K extends string> = { buckets: string[] } & Record<K, (number | null)[]>

export type ProductCard = { id: string; title: string; thumbnail: string | null }

export type SalesResponse = {
  range: RangeInfo
  currency: string
  totals: {
    orders: number
    sales: number
    collected: number
    outstanding: number
    units: number
    average_order: number
  }
  previous: {
    orders: number
    sales: number
    collected: number
    units: number
    average_order: number
  }
  series: { current: SeriesOf<"sales" | "orders">; previous: SeriesOf<"sales" | "orders"> }
  products: {
    product_id: string | null
    title: string
    handle: string | null
    thumbnail: string | null
    units: number
    sales: number
  }[]
  methods: { provider_id: string | null; orders: number; sales: number; collected: number }[]
  provinces: { province: string; orders: number; sales: number }[]
  customers: { identified: number; returning: number; new: number }
  canceled_orders: number
  pending: {
    proofs_to_review: number
    awaiting_payment: number
    awaiting_amount: number
    to_fulfill: number
  }
}

export type TrafficTotals = {
  sessions: number
  pageviews: number
  product_views: number
  viewed_product: number
  added_to_cart: number
  reached_checkout: number
  contacted_whatsapp: number
  whatsapp_clicks: number
  purchased: number
}

export type Ranked = { key: string; count: number }

export type RankedPage = Ranked & { product: ProductCard | null }

export type TrafficResponse = {
  backend: "redis" | "memory"
  range: RangeInfo
  totals: TrafficTotals & { visitors: number; new_visitors: number; returning_visitors: number }
  previous: TrafficTotals & { visitors: number }
  series: {
    current: SeriesOf<"sessions" | "pageviews">
    previous: SeriesOf<"sessions" | "pageviews">
  }
  devices: Ranked[]
  sources: Ranked[]
  countries: Ranked[]
  cities: Ranked[]
  top_pages: RankedPage[]
  landing_pages: RankedPage[]
  whatsapp_pages: RankedPage[]
  products: {
    handle: string
    views: number
    whatsapp_clicks: number
    product: ProductCard | null
  }[]
}

export type LiveVisitor = {
  id: string
  path: string
  page_type: string
  handle: string | null
  device: string
  country: string | null
  city: string | null
  source: string
  landing: string | null
  started_at: number
  last_seen_at: number
  pages: number
  has_cart: boolean
  logged_in: boolean
  added_to_cart: boolean
  reached_checkout: boolean
  contacted_whatsapp: boolean
  purchased: boolean
  product: ProductCard | null
}

export type LiveResponse = {
  backend: "redis" | "memory"
  window_seconds: number
  recent_window_minutes: number
  active: number
  recent: number
  today: TrafficTotals
  visitors: LiveVisitor[]
  generated_at: number
  storefront_url: string | null
}

/** The live view is a few Redis reads; every 5 s costs nothing. */
const LIVE_REFRESH_MS = 5_000

/**
 * Sales run a Postgres query; orders arrive a few times a day, so every two
 * minutes is plenty. React Query pauses both while the tab is hidden.
 */
const REPORT_REFRESH_MS = 120_000

export const useLive = () =>
  useQuery({
    queryKey: ["y2k-analytics", "live"],
    queryFn: () => sdk.client.fetch<LiveResponse>("/admin/analytics/live"),
    refetchInterval: LIVE_REFRESH_MS,
  })

export const useSales = (preset: Preset) =>
  useQuery({
    queryKey: ["y2k-analytics", "sales", preset],
    queryFn: () =>
      sdk.client.fetch<SalesResponse>("/admin/analytics/sales", {
        query: { preset },
      }),
    refetchInterval: REPORT_REFRESH_MS,
    // A new range keeps the old numbers on screen, dimmed, until it arrives.
    placeholderData: keepPreviousData,
  })

export const useTraffic = (preset: Preset) =>
  useQuery({
    queryKey: ["y2k-analytics", "traffic", preset],
    queryFn: () =>
      sdk.client.fetch<TrafficResponse>("/admin/analytics/traffic", {
        query: { preset },
      }),
    refetchInterval: REPORT_REFRESH_MS,
    placeholderData: keepPreviousData,
  })
