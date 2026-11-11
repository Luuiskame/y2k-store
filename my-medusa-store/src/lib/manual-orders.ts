import {
  BAC_PROVIDER_ID,
  CONTRA_ENTREGA_PROVIDER_ID,
  buildContraEntregaMetadata,
} from "./contra-entrega"

/**
 * Orders the owner registers from the admin ("Nuevo pedido") instead of
 * buying them in the storefront: sales closed over WhatsApp or Instagram,
 * and above all pago contra entrega, which in the storefront is only a
 * WhatsApp handoff and never becomes an order by itself.
 *
 * How it works: the admin builds a *working cart* on the server (so prices,
 * promotions, taxes, stock and shipping are computed exactly as in the
 * storefront), shows its totals for review, and completes it with the chosen
 * payment method. When the sale started in the storefront, the working cart
 * is a copy of the customer's cart. The customer's own cart is never
 * completed: the storefront keeps its id in a cookie and cannot add to a
 * completed cart, so closing it would break that customer's next visit.
 *
 * Everything here is pure; the workflows and routes do the reading and
 * writing.
 */

export type ManualOrderPaymentMethod = "contra_entrega" | "transferencia_bac"

export const PAYMENT_PROVIDER_BY_METHOD: Record<
  ManualOrderPaymentMethod,
  string
> = {
  contra_entrega: CONTRA_ENTREGA_PROVIDER_ID,
  transferencia_bac: BAC_PROVIDER_ID,
}

/** Where the order came from, kept on the working cart and then the order. */
export type ManualOrderSource = "store_cart" | "manual"

/**
 * `metadata.manual_order` on a working cart. Completing the cart copies its
 * metadata to the order, so the order carries the same key (plus the payment
 * method and the note, added just before completing).
 */
export type ManualOrderMetadata = {
  created_by: string
  source: ManualOrderSource
  source_cart_id?: string
  payment_method?: ManualOrderPaymentMethod
  note?: string
}

export const MANUAL_ORDER_KEY = "manual_order"

/**
 * What a cart query must ask for to get real totals. The cart module adds up
 * whatever columns were loaded, so naming single columns of the lines or the
 * shipping methods ("items.id") makes every total come back as zero, without
 * an error. Always whole lines and whole shipping methods.
 */
export const CART_TOTALS_FIELDS = [
  "total",
  "item_total",
  "shipping_total",
  "discount_total",
  "tax_total",
  "items.*",
  "items.total",
  "shipping_methods.*",
]

/**
 * `metadata.manual_order_placed` on the customer's own cart once an order was
 * registered from it, so the list of carts can say so instead of offering it
 * again.
 */
export type SourceCartPlacedMark = {
  order_id: string
  display_id: number | null
  at: string
}

export const SOURCE_CART_PLACED_KEY = "manual_order_placed"

/** Keys that describe a cart's role here and must not travel to a copy. */
const OWN_METADATA_KEYS = [MANUAL_ORDER_KEY, SOURCE_CART_PLACED_KEY, "contra_entrega"]

type Metadata = Record<string, unknown> | null | undefined

export const readManualOrderMetadata = (
  metadata: Metadata
): ManualOrderMetadata | null => {
  const value = metadata?.[MANUAL_ORDER_KEY]
  if (!value || typeof value !== "object") {
    return null
  }
  const candidate = value as Partial<ManualOrderMetadata>
  return typeof candidate.created_by === "string" &&
    (candidate.source === "store_cart" || candidate.source === "manual")
    ? (candidate as ManualOrderMetadata)
    : null
}

export const readSourceCartPlacedMark = (
  metadata: Metadata
): SourceCartPlacedMark | null => {
  const value = metadata?.[SOURCE_CART_PLACED_KEY]
  if (!value || typeof value !== "object") {
    return null
  }
  const candidate = value as Partial<SourceCartPlacedMark>
  return typeof candidate.order_id === "string"
    ? {
        order_id: candidate.order_id,
        display_id:
          typeof candidate.display_id === "number" ? candidate.display_id : null,
        at: typeof candidate.at === "string" ? candidate.at : "",
      }
    : null
}

/** A customer's cart metadata without the keys this feature owns. */
export const carryOverMetadata = (metadata: Metadata): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(metadata ?? {}).filter(
      ([key]) => !OWN_METADATA_KEYS.includes(key)
    )
  )

/**
 * The cart id inside whatever the owner pasted: the storefront's WhatsApp
 * message ends with "Pedido #: cart_01…", but a bare id or a message the
 * customer edited work too. Medusa ids are a prefix plus a 26-character ULID.
 */
export const extractCartId = (text: string | null | undefined): string | null => {
  const match = /cart_[0-9A-Za-z]{26}(?![0-9A-Za-z])/.exec(text ?? "")
  return match ? match[0] : null
}

/** Last eight digits: a Honduran number however it was typed. */
export const phoneDigits = (phone: string | null | undefined): string =>
  (phone ?? "").replace(/\D/g, "").slice(-8)

const clean = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""

export type ManualOrderAddressInput = {
  first_name: string
  last_name?: string | null
  phone: string
  address_1: string
  address_2?: string | null
  company?: string | null
  city: string
  province: string
  postal_code?: string | null
  country_code: string
}

/**
 * The address as the storefront's checkout stores it (see its
 * shipping-address component): city is the town, province the department,
 * address_2 and company the two references, postal code a fixed "00000".
 */
export const normalizeAddress = (input: ManualOrderAddressInput) => ({
  first_name: clean(input.first_name),
  last_name: clean(input.last_name),
  phone: clean(input.phone),
  address_1: clean(input.address_1),
  address_2: clean(input.address_2),
  company: clean(input.company),
  city: clean(input.city),
  province: clean(input.province),
  postal_code: clean(input.postal_code) || "00000",
  country_code: clean(input.country_code).toLowerCase(),
})

export type NormalizedAddress = ReturnType<typeof normalizeAddress>

export type ManualOrderItemInput = { variant_id: string; quantity: number }

/** One line per variant: the same variant added twice is one line. */
export const mergeItems = (items: ManualOrderItemInput[]): ManualOrderItemInput[] => {
  const byVariant = new Map<string, number>()
  for (const item of items) {
    byVariant.set(
      item.variant_id,
      (byVariant.get(item.variant_id) ?? 0) + item.quantity
    )
  }
  return [...byVariant].map(([variant_id, quantity]) => ({ variant_id, quantity }))
}

const SIZE_ORDER = [
  "XXS",
  "2XS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "XXXL",
  "3XL",
  "4XL",
  "5XL",
]

/** Position of a clothing size in a variant title ("M", "L / Negro"), or -1. */
const sizeRank = (title: string): number => {
  const first = title.split(/[\s/·,-]+/)[0]?.toUpperCase() ?? ""
  return SIZE_ORDER.indexOf(first)
}

type SortableVariant = { title?: string | null; variant_rank?: number | null }

/**
 * Variants in the order a person reads sizes: the rank set in the admin
 * first, then S < M < L < XL, then by name (numbers as numbers, so talla 8
 * comes before talla 10).
 */
export const compareVariants = (a: SortableVariant, b: SortableVariant): number => {
  const byRank = (a.variant_rank ?? 0) - (b.variant_rank ?? 0)
  if (byRank !== 0) {
    return byRank
  }
  const aTitle = a.title ?? ""
  const bTitle = b.title ?? ""
  const aSize = sizeRank(aTitle)
  const bSize = sizeRank(bTitle)
  if (aSize !== bSize) {
    // Titles that are not a size go after the ones that are.
    if (aSize === -1) return 1
    if (bSize === -1) return -1
    return aSize - bSize
  }
  return aTitle.localeCompare(bTitle, "es", { numeric: true })
}

const num = (value: unknown): number => {
  if (value && typeof value === "object" && "value" in (value as object)) {
    return Number((value as { value: unknown }).value) || 0
  }
  return Number(value) || 0
}

const money = (value: unknown): number => Math.round(num(value) * 100) / 100

const fullName = (address: any): string =>
  [address?.first_name, address?.last_name].filter(Boolean).join(" ")

/* -------------------------------------------------------------------------- */
/* What the admin page receives                                               */
/* -------------------------------------------------------------------------- */

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

const toLine = (item: any): CartLine => ({
  id: item.id,
  variant_id: item.variant_id ?? null,
  product_id: item.product_id ?? null,
  title: item.product_title ?? item.title ?? "Producto",
  variant_title: item.variant_title ?? null,
  thumbnail: item.thumbnail ?? null,
  quantity: num(item.quantity),
  unit_price: money(item.unit_price),
  total: money(item.total ?? num(item.unit_price) * num(item.quantity)),
})

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

const toAddressView = (address: any): AddressView | null =>
  address
    ? {
        full_name: fullName(address),
        first_name: address.first_name ?? "",
        last_name: address.last_name ?? "",
        phone: address.phone ?? "",
        address_1: address.address_1 ?? "",
        address_2: address.address_2 ?? "",
        company: address.company ?? "",
        city: address.city ?? "",
        province: address.province ?? "",
        country_code: (address.country_code ?? "").toLowerCase(),
      }
    : null

/** A customer's storefront cart, as a row in "Carritos de la tienda". */
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
  items: Pick<CartLine, "title" | "variant_title" | "quantity" | "thumbnail">[]
  total: number
  has_shipping_method: boolean
  placed: SourceCartPlacedMark | null
}

const iso = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : String(value ?? "")

export const toStoreCartCard = (cart: any): StoreCartCard => {
  const lines: CartLine[] = (cart.items ?? []).map(toLine)
  return {
    id: cart.id,
    updated_at: iso(cart.updated_at),
    customer_name: fullName(cart.shipping_address),
    phone: cart.shipping_address?.phone ?? "",
    email: cart.email ?? null,
    city: cart.shipping_address?.city ?? "",
    province: cart.shipping_address?.province ?? "",
    currency_code: cart.currency_code,
    item_count: lines.reduce((count, line) => count + line.quantity, 0),
    items: lines.map(({ title, variant_title, quantity, thumbnail }) => ({
      title,
      variant_title,
      quantity,
      thumbnail,
    })),
    total: money(cart.total),
    has_shipping_method: (cart.shipping_methods ?? []).length > 0,
    placed: readSourceCartPlacedMark(cart.metadata),
  }
}

/**
 * Whether a storefront cart is worth offering: it has something in it and
 * someone to deliver it to. A cart with no phone is a visitor who never
 * reached the address step.
 */
export const isOfferableCart = (cart: any): boolean =>
  !cart.completed_at &&
  !readManualOrderMetadata(cart.metadata) &&
  (cart.items ?? []).length > 0 &&
  !!phoneDigits(cart.shipping_address?.phone)

/**
 * The carts still waiting first, then the ones an order already came out
 * of; each group keeps the order it arrived in (most recently touched
 * first). Noting an order on a cart touches it, which would otherwise put
 * every cart just dealt with back at the top of the list.
 */
export const waitingFirst = <T extends { metadata?: Metadata }>(carts: T[]): T[] => [
  ...carts.filter((cart) => !readSourceCartPlacedMark(cart.metadata)),
  ...carts.filter((cart) => !!readSourceCartPlacedMark(cart.metadata)),
]

/** Matches a cart against what the owner typed: name, phone or cart id. */
export const cartMatches = (cart: any, search: string): boolean => {
  const term = search.trim().toLowerCase()
  if (!term) {
    return true
  }
  const digits = term.replace(/\D/g, "")
  const haystack = [
    cart.id,
    fullName(cart.shipping_address),
    cart.email,
    cart.shipping_address?.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (haystack.includes(term)) {
    return true
  }
  // Four digits or more are read as part of a phone number.
  return (
    digits.length >= 4 &&
    (cart.shipping_address?.phone ?? "").replace(/\D/g, "").includes(digits)
  )
}

/** A storefront cart turned into the form's starting point. */
export type StoreCartPrefill = {
  source_cart_id: string
  email: string | null
  currency_code: string
  items: CartLine[]
  shipping_address: AddressView | null
  shipping_option_id: string | null
  promo_codes: string[]
  total: number
  placed: SourceCartPlacedMark | null
  completed: boolean
}

export const toStoreCartPrefill = (cart: any): StoreCartPrefill => ({
  source_cart_id: cart.id,
  email: cart.email ?? null,
  currency_code: cart.currency_code,
  items: (cart.items ?? []).map(toLine),
  shipping_address: toAddressView(cart.shipping_address),
  shipping_option_id: cart.shipping_methods?.[0]?.shipping_option_id ?? null,
  promo_codes: (cart.promotions ?? [])
    .map((promotion: any) => promotion?.code)
    .filter((code: unknown): code is string => typeof code === "string"),
  total: money(cart.total),
  placed: readSourceCartPlacedMark(cart.metadata),
  completed: !!cart.completed_at,
})

export type ShippingOptionView = { id: string; name: string; amount: number }

export const toShippingOptionView = (option: any): ShippingOptionView => ({
  id: option.id,
  name: option.name ?? "Envío",
  amount: money(
    option.calculated_price?.calculated_amount ?? option.amount ?? 0
  ),
})

/** The working cart with its totals: what the review step shows. */
export type WorkingCartSummary = {
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
  /** What contra entrega would add, so the page never redoes the math. */
  contra_entrega: { surcharge: number; collect_total: number }
}

export const toWorkingCartSummary = (
  cart: any,
  shippingOptions: any[]
): WorkingCartSummary => {
  const method = cart.shipping_methods?.[0]
  const total = money(cart.total)
  const cod = buildContraEntregaMetadata(total, true)

  return {
    id: cart.id,
    currency_code: cart.currency_code,
    email: cart.email ?? null,
    items: (cart.items ?? []).map(toLine),
    shipping_address: toAddressView(cart.shipping_address),
    shipping_method: method
      ? {
          id: method.shipping_option_id,
          name: method.name ?? "Envío",
          amount: money(method.amount),
        }
      : null,
    shipping_options: shippingOptions
      .map(toShippingOptionView)
      .sort((a, b) => a.amount - b.amount || a.name.localeCompare(b.name)),
    promo_codes: (cart.promotions ?? [])
      .map((promotion: any) => promotion?.code)
      .filter((code: unknown): code is string => typeof code === "string"),
    item_total: money(cart.item_total),
    shipping_total: money(cart.shipping_total),
    discount_total: money(cart.discount_total),
    tax_total: money(cart.tax_total),
    total,
    contra_entrega: { surcharge: cod.surcharge, collect_total: cod.collect_total },
  }
}

/**
 * Medusa's own workflows explain themselves in English and in its terms.
 * The few the owner can actually run into are reworded; anything else keeps
 * its message, which still beats a generic failure.
 */
const WORKFLOW_ERRORS: [RegExp, string][] = [
  [
    /required inventory|insufficient inventory|not have the required inventory/i,
    "No hay suficiente inventario de alguno de los productos. Revisá las cantidades.",
  ],
  [
    /do not have a price|does not have a price|missing prices?/i,
    "Algún producto no tiene precio en la moneda de la tienda.",
  ],
  [
    /shipping options? (are|is) invalid/i,
    "Ese método de envío no está disponible para esta dirección.",
  ],
  [
    /not associated with (any )?(valid )?sales channel|not available in (the )?sales channel/i,
    "Algún producto no está disponible en el canal de venta de la tienda.",
  ],
  [/already completed/i, "Ese pedido ya fue creado."],
  [
    /promotion code .* (is )?invalid|promo(tion)? code/i,
    "El código de descuento ya no es válido.",
  ],
  [
    /timed? ?out acquiring lock|failed to acquire lock/i,
    "El pedido se está procesando. Esperá unos segundos e intentá de nuevo.",
  ],
]

/** The error to answer with: same type and status, a message in Spanish. */
export const spanishWorkflowError = (error: unknown): unknown => {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : ""
  const match = WORKFLOW_ERRORS.find(([pattern]) => pattern.test(message))
  if (match && error && typeof error === "object") {
    ;(error as { message: string }).message = match[1]
  }
  return error
}

/**
 * What stands between a working cart and an order, in the owner's words;
 * null when it can be completed.
 */
export const completionBlocker = (cart: any): string | null => {
  if (!cart) {
    return "No se encontró el pedido en preparación. Volvé a revisarlo."
  }
  if (!readManualOrderMetadata(cart.metadata)) {
    return "Ese carrito no se preparó desde el panel."
  }
  if ((cart.items ?? []).length === 0) {
    return "El pedido no tiene productos."
  }
  if (!phoneDigits(cart.shipping_address?.phone)) {
    return "Falta el teléfono del cliente."
  }
  if (!clean(cart.shipping_address?.address_1)) {
    return "Falta la dirección de entrega."
  }
  if ((cart.shipping_methods ?? []).length === 0) {
    return "Elegí un método de envío."
  }
  return null
}
