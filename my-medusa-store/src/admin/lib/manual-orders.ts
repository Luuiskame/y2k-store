import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { sdk } from "./client"
import { COMPACT_ORDERS_KEY, COMPACT_PRODUCTS_KEY } from "./compact"

/**
 * "Nuevo pedido": the browser half of `src/lib/manual-orders.ts`. The shapes
 * mirror what `src/api/admin/manual-orders/*` return.
 */

export type PaymentMethod = "contra_entrega" | "transferencia_bac"

export type CartLine = {
  id: string
  variant_id: string | null
  product_id: string | null
  title: string
  variant_title: string | null
  thumbnail: string | null
  quantity: number
  unit_price: number
  total: number
}

export type AddressView = {
  full_name: string
  first_name: string
  last_name: string
  phone: string
  address_1: string
  address_2: string
  company: string
  city: string
  province: string
  country_code: string
}

export type PlacedMark = { order_id: string; display_id: number | null; at: string }

export type StoreCartCard = {
  id: string
  updated_at: string
  customer_name: string
  phone: string
  email: string | null
  city: string
  province: string
  currency_code: string
  item_count: number
  items: {
    title: string
    variant_title: string | null
    quantity: number
    thumbnail: string | null
  }[]
  total: number
  has_shipping_method: boolean
  placed: PlacedMark | null
}

export type StoreCartPrefill = {
  source_cart_id: string
  email: string | null
  currency_code: string
  items: CartLine[]
  shipping_address: AddressView | null
  shipping_option_id: string | null
  promo_codes: string[]
  total: number
  placed: PlacedMark | null
  completed: boolean
}

export type ShippingOptionView = { id: string; name: string; amount: number }

export type WorkingCart = {
  id: string
  currency_code: string
  email: string | null
  items: CartLine[]
  shipping_address: AddressView | null
  shipping_method: ShippingOptionView | null
  shipping_options: ShippingOptionView[]
  promo_codes: string[]
  item_total: number
  shipping_total: number
  discount_total: number
  tax_total: number
  total: number
  contra_entrega: { surcharge: number; collect_total: number }
}

export type CreateWorkingCartInput = {
  items: { variant_id: string; quantity: number }[]
  email: string | null
  shipping_address: {
    first_name: string
    last_name: string
    phone: string
    address_1: string
    address_2: string
    company: string
    city: string
    province: string
    country_code: string
  }
  promo_codes?: string[]
  shipping_option_id?: string | null
  source_cart_id?: string | null
  replace_cart_id?: string | null
}

export type PlacedOrder = { id: string; display_id: number | null }

const STORE_CARTS_KEY = ["y2k-manual-orders", "store-carts"]

/** The storefront carts that could be a sale waiting on WhatsApp. */
export const useStoreCarts = (q: string) =>
  useQuery({
    queryKey: [...STORE_CARTS_KEY, q],
    queryFn: () =>
      sdk.client.fetch<{ carts: StoreCartCard[]; matched_cart_id: string | null }>(
        "/admin/manual-orders/store-carts",
        { query: q ? { q } : {} }
      ),
    // A customer may reach the payment step while this page is open.
    refetchInterval: 120_000,
  })

export const fetchStoreCart = (id: string) =>
  sdk.client
    .fetch<{ cart: StoreCartPrefill }>(`/admin/manual-orders/store-carts/${id}`)
    .then(({ cart }) => cart)

/** Builds (or rebuilds) the working cart and returns its real totals. */
export const useCreateWorkingCart = () =>
  useMutation({
    mutationFn: (input: CreateWorkingCartInput) =>
      sdk.client
        .fetch<{ cart: WorkingCart }>("/admin/manual-orders/carts", {
          method: "POST",
          body: input,
        })
        .then(({ cart }) => cart),
  })

export const useSetShippingMethod = () =>
  useMutation({
    mutationFn: ({ cartId, optionId }: { cartId: string; optionId: string }) =>
      sdk.client
        .fetch<{ cart: WorkingCart }>(
          `/admin/manual-orders/carts/${cartId}/shipping-method`,
          { method: "POST", body: { option_id: optionId } }
        )
        .then(({ cart }) => cart),
  })

export const useCompleteWorkingCart = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cartId,
      ...body
    }: {
      cartId: string
      payment_method: PaymentMethod
      apply_surcharge: boolean
      note: string | null
    }) =>
      sdk.client
        .fetch<{ order: PlacedOrder; already_placed: boolean }>(
          `/admin/manual-orders/carts/${cartId}/complete`,
          { method: "POST", body }
        )
        .then(({ order }) => order),
    onSuccess: () => {
      // A new order changes every list that shows orders or stock: Medusa's
      // own ("orders"), ours, the store carts and Estadísticas.
      for (const queryKey of [
        ["orders"],
        COMPACT_ORDERS_KEY,
        COMPACT_PRODUCTS_KEY,
        STORE_CARTS_KEY,
        ["y2k-analytics"],
        ["inventory_items"],
        ["reservations"],
      ]) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
