import { isContraEntregaProvider } from "./contra-entrega"
import { compareVariants, readManualOrderMetadata } from "./manual-orders"

/**
 * Small versions of orders and products for the admin's phone screens
 * (`/admin/compact/*`). Medusa's own list routes answer with every column of
 * every line item and none of what a phone list needs to filter by (what is
 * still owed, what still has to ship, how many of each size are left), so
 * the phone would download hundreds of kilobytes to draw fifteen cards. These
 * carry only what a card shows.
 *
 * Pure: the routes do the reading.
 */

const num = (value: unknown): number => {
  if (value && typeof value === "object" && "value" in (value as object)) {
    return Number((value as { value: unknown }).value) || 0
  }
  return Number(value) || 0
}

const money = (value: unknown): number => Math.round(num(value) * 100) / 100

const iso = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value ?? "")

/* ------------------------------------------------------------------ orders */

/** Payment states in which the money is in (or was, and went back). */
const SETTLED_PAYMENT = ["captured", "partially_refunded", "refunded", "canceled"]

/** Fulfillment states in which something still has to leave the store. */
const TO_SHIP = ["not_fulfilled", "partially_fulfilled"]

const CLOSED_ORDER = ["canceled", "archived", "draft"]

export type OrderView = "all" | "unpaid" | "unfulfilled"

/** Whether an order belongs in one of the phone list's filters. */
export const orderMatchesView = (
  order: { status?: string; payment_status?: string; fulfillment_status?: string },
  view: OrderView
): boolean => {
  if (view === "all") {
    return true
  }
  if (CLOSED_ORDER.includes(order.status ?? "")) {
    return false
  }
  return view === "unpaid"
    ? !SETTLED_PAYMENT.includes(order.payment_status ?? "")
    : TO_SHIP.includes(order.fulfillment_status ?? "")
}

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
  /** The first lines; `item_count` says how many units there are in all. */
  items: {
    title: string
    variant_title: string | null
    quantity: number
    thumbnail: string | null
  }[]
  /** Provider of the payment that stands (not a canceled attempt). */
  payment_provider: string | null
  /** What the courier must collect, for a contra entrega order. */
  collect_total: number | null
  bac_status: string | null
  /** Registered from the admin instead of bought in the storefront. */
  manual: boolean
}

const ITEMS_ON_CARD = 3

const standingPayment = (order: any): any | undefined => {
  const payments: any[] = (order.payment_collections ?? []).flatMap(
    (collection: any) => collection?.payments ?? []
  )
  return payments.find((payment) => !payment?.canceled_at) ?? payments[0]
}

export const toCompactOrder = (order: any): CompactOrder => {
  const address = order.shipping_address ?? {}
  const items: any[] = order.items ?? []
  const provider = standingPayment(order)?.provider_id ?? null
  const cod = order.metadata?.contra_entrega

  return {
    id: order.id,
    display_id: order.display_id ?? null,
    created_at: iso(order.created_at),
    status: order.status ?? "pending",
    payment_status: order.payment_status ?? "not_paid",
    fulfillment_status: order.fulfillment_status ?? "not_fulfilled",
    total: money(order.total),
    currency_code: order.currency_code ?? "hnl",
    customer_name: [address.first_name, address.last_name].filter(Boolean).join(" "),
    phone: address.phone ?? "",
    country_code: (address.country_code ?? "").toLowerCase(),
    city: address.city ?? "",
    province: address.province ?? "",
    email: order.email ?? null,
    item_count: items.reduce((count, item) => count + num(item.quantity), 0),
    items: items.slice(0, ITEMS_ON_CARD).map((item) => ({
      title: item.product_title ?? item.title ?? "Producto",
      variant_title: item.variant_title ?? null,
      quantity: num(item.quantity),
      thumbnail: item.thumbnail ?? null,
    })),
    payment_provider: provider,
    collect_total:
      isContraEntregaProvider(provider) && cod && typeof cod === "object"
        ? money((cod as { collect_total?: unknown }).collect_total)
        : null,
    bac_status:
      typeof order.metadata?.bac_transfer_status === "string"
        ? order.metadata.bac_transfer_status
        : null,
    manual: !!readManualOrderMetadata(order.metadata),
  }
}

/* ---------------------------------------------------------------- products */

export type CompactVariant = {
  id: string
  title: string
  sku: string | null
  /** What a customer in the store's home region pays; null with no price. */
  price: number | null
  /**
   * How many can still be sold from the store's sales channel; null when
   * stock is not tracked for the variant, which never runs out.
   */
  available: number | null
  allow_backorder: boolean
  /**
   * Where its stock is kept, when that is one inventory item in one
   * location: the only case a phone can edit with a plus and a minus.
   */
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

const singleStock = (variant: any): CompactVariant["stock"] => {
  const links: any[] = variant.inventory_items ?? []
  if (links.length !== 1 || num(links[0]?.required_quantity || 1) !== 1) {
    return null
  }
  const levels: any[] = links[0]?.inventory?.location_levels ?? []
  if (levels.length !== 1) {
    return null
  }
  const itemId = links[0]?.inventory_item_id ?? links[0]?.inventory?.id
  if (!itemId || !levels[0]?.location_id) {
    return null
  }
  return {
    inventory_item_id: itemId,
    location_id: levels[0].location_id,
    stocked: num(levels[0].stocked_quantity),
    reserved: num(levels[0].reserved_quantity),
  }
}

export const toCompactProduct = (
  product: any,
  availability: Record<string, { availability: number | null } | undefined>
): CompactProduct => ({
  id: product.id,
  title: product.title ?? "Producto",
  thumbnail: product.thumbnail ?? null,
  status: product.status ?? "draft",
  variants: [...(product.variants ?? [])].sort(compareVariants).map((variant: any) => {
    const amount = Number(variant.calculated_price?.calculated_amount)
    return {
      id: variant.id,
      title: variant.title ?? "",
      sku: variant.sku ?? null,
      price: Number.isFinite(amount) ? money(amount) : null,
      available: variant.manage_inventory
        ? Math.max(0, num(availability[variant.id]?.availability))
        : null,
      allow_backorder: !!variant.allow_backorder,
      stock: variant.manage_inventory ? singleStock(variant) : null,
    }
  }),
})
