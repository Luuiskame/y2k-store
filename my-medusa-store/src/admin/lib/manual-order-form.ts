import { tr } from "../i18n/tr"
import type { CompactProduct, CompactVariant } from "./compact"
import type {
  CreateWorkingCartInput,
  StoreCartPrefill,
} from "./manual-orders"
import { toWhatsappNumber } from "./whatsapp"

/**
 * The state of the "Nuevo pedido" form and the rules it is checked against,
 * apart from the components so both can be unit-tested. Pure.
 */

export type Line = {
  variant_id: string
  quantity: number
  title: string
  variant_title: string | null
  thumbnail: string | null
  /** Unit price as last known; the server's review has the final word. */
  price: number | null
  /** Units that can still be sold; null when stock is not tracked. */
  available: number | null
  allow_backorder: boolean
}

export type CustomerForm = {
  full_name: string
  phone: string
  email: string
  city: string
  province: string
  address_1: string
  address_2: string
  company: string
  country_code: string
}

export const EMPTY_CUSTOMER: CustomerForm = {
  full_name: "",
  phone: "",
  email: "",
  city: "",
  province: "",
  address_1: "",
  address_2: "",
  company: "",
  country_code: "hn",
}

export const HONDURAS_DEPARTMENTS = [
  "Atlántida",
  "Choluteca",
  "Colón",
  "Comayagua",
  "Copán",
  "Cortés",
  "El Paraíso",
  "Francisco Morazán",
  "Gracias a Dios",
  "Intibucá",
  "Islas de la Bahía",
  "La Paz",
  "Lempira",
  "Ocotepeque",
  "Olancho",
  "Santa Bárbara",
  "Valle",
  "Yoro",
] as const

/** Where contra entrega is offered: one tap fills town and department. */
export const QUICK_PLACES = [
  { label: "Tegucigalpa", city: "Tegucigalpa", province: "Francisco Morazán" },
  { label: "San Pedro Sula", city: "San Pedro Sula", province: "Cortés" },
] as const

/**
 * A cart id anywhere in a pasted WhatsApp message. The same rule as the
 * server's (`extractCartId` in src/lib/manual-orders.ts): a Medusa id is a
 * prefix plus a 26-character ULID.
 */
export const extractCartId = (text: string | null | undefined): string | null => {
  const match = /cart_[0-9A-Za-z]{26}(?![0-9A-Za-z])/.exec(text ?? "")
  return match ? match[0] : null
}

const MAX_QUANTITY = 99

/**
 * Medusa keeps first and last name apart; the form asks for one field, like
 * the storefront's checkout: the first word is the name, the rest the
 * surnames.
 */
export const splitFullName = (
  fullName: string
): { first_name: string; last_name: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") }
}

const lineOf = (
  product: Pick<CompactProduct, "title" | "thumbnail">,
  variant: CompactVariant
): Line => ({
  variant_id: variant.id,
  quantity: 1,
  title: product.title,
  variant_title: variant.title || null,
  thumbnail: product.thumbnail,
  price: variant.price,
  available: variant.available,
  allow_backorder: variant.allow_backorder,
})

/** How many of a line can be asked for at most. */
export const maxQuantity = (line: Pick<Line, "available" | "allow_backorder">): number =>
  line.available === null || line.allow_backorder
    ? MAX_QUANTITY
    : Math.min(MAX_QUANTITY, line.available)

/** Whether a variant can be added at all. */
export const isSellable = (variant: CompactVariant): boolean =>
  variant.price !== null &&
  (variant.available === null || variant.allow_backorder || variant.available > 0)

/** Adds one unit of a variant: a new line, or one more on the line it has. */
export const addVariant = (
  lines: Line[],
  product: Pick<CompactProduct, "title" | "thumbnail">,
  variant: CompactVariant
): Line[] => {
  const existing = lines.find((line) => line.variant_id === variant.id)
  if (!existing) {
    return [...lines, lineOf(product, variant)]
  }
  // The picker's numbers are fresher than the line's.
  const fresh = { ...existing, price: variant.price, available: variant.available }
  return lines.map((line) =>
    line.variant_id === variant.id
      ? { ...fresh, quantity: Math.min(maxQuantity(fresh), line.quantity + 1) }
      : line
  )
}

/** Sets a line's quantity; zero or less removes the line. */
export const setQuantity = (
  lines: Line[],
  variantId: string,
  quantity: number
): Line[] =>
  quantity <= 0
    ? lines.filter((line) => line.variant_id !== variantId)
    : lines.map((line) =>
        line.variant_id === variantId
          ? { ...line, quantity: Math.min(MAX_QUANTITY, Math.round(quantity)) }
          : line
      )

export const unitCount = (lines: Line[]): number =>
  lines.reduce((count, line) => count + line.quantity, 0)

/** Products only, at the picker's prices: an estimate until the review. */
export const estimateSubtotal = (lines: Line[]): number =>
  Math.round(
    lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0) * 100
  ) / 100

export type FormError = {
  field: "items" | keyof CustomerForm
  message: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** What keeps the form from being reviewed, in order; empty when it is ready. */
export const validateOrderForm = (
  lines: Line[],
  customer: CustomerForm
): FormError[] => {
  const errors: FormError[] = []
  const words = tr().manualOrder.errors

  if (lines.length === 0) {
    errors.push({ field: "items", message: words.noItems })
  }
  for (const line of lines) {
    if (line.quantity > maxQuantity(line)) {
      const name = line.variant_title ? `${line.title} (${line.variant_title})` : line.title
      errors.push({
        field: "items",
        message:
          line.available === 0
            ? words.soldOut(name)
            : words.onlyLeft(line.available ?? 0, name),
      })
    }
  }

  if (!customer.full_name.trim()) {
    errors.push({ field: "full_name", message: words.noName })
  }
  if (!toWhatsappNumber(customer.phone, customer.country_code)) {
    errors.push({
      field: "phone",
      message: customer.phone.trim() ? words.badPhone : words.noPhone,
    })
  }
  if (!customer.city.trim()) {
    errors.push({ field: "city", message: words.noCity })
  }
  if (!customer.province.trim()) {
    errors.push({ field: "province", message: words.noProvince })
  }
  if (!customer.address_1.trim()) {
    errors.push({ field: "address_1", message: words.noAddress })
  }
  if (customer.email.trim() && !EMAIL.test(customer.email.trim())) {
    errors.push({ field: "email", message: words.badEmail })
  }

  return errors
}

/** The body of `POST /admin/manual-orders/carts` for the current form. */
export const toCartInput = (
  lines: Line[],
  customer: CustomerForm,
  extras: {
    source?: StoreCartPrefill | null
    shippingOptionId?: string | null
    replaceCartId?: string | null
  } = {}
): CreateWorkingCartInput => {
  const { first_name, last_name } = splitFullName(customer.full_name)
  const source = extras.source ?? null

  return {
    items: lines.map(({ variant_id, quantity }) => ({ variant_id, quantity })),
    email: customer.email.trim() || null,
    shipping_address: {
      first_name,
      last_name,
      phone: customer.phone.trim(),
      address_1: customer.address_1.trim(),
      address_2: customer.address_2.trim(),
      company: customer.company.trim(),
      city: customer.city.trim(),
      province: customer.province.trim(),
      country_code: customer.country_code || "hn",
    },
    ...(source
      ? { source_cart_id: source.source_cart_id, promo_codes: source.promo_codes }
      : {}),
    shipping_option_id: extras.shippingOptionId ?? source?.shipping_option_id ?? null,
    replace_cart_id: extras.replaceCartId ?? null,
  }
}

/**
 * The form as kept while it is being filled. A stray tap on the bottom bar
 * leaves the page, and on a phone that is easy to do with half an address
 * typed: the draft brings it all back.
 */
export type Draft = {
  lines: Line[]
  customer: CustomerForm
  source: StoreCartPrefill | null
  currency: string
}

export const isBlankForm = (
  lines: Line[],
  customer: CustomerForm,
  source: StoreCartPrefill | null
): boolean =>
  lines.length === 0 &&
  !source &&
  (Object.keys(EMPTY_CUSTOMER) as (keyof CustomerForm)[]).every(
    (field) => customer[field].trim() === EMPTY_CUSTOMER[field]
  )

/** A stored draft back as form state; null for anything that is not one. */
export const parseDraft = (raw: string | null | undefined): Draft | null => {
  if (!raw) {
    return null
  }
  try {
    const value = JSON.parse(raw)
    if (
      !value ||
      !Array.isArray(value.lines) ||
      !value.customer ||
      typeof value.customer !== "object"
    ) {
      return null
    }
    const lines: Line[] = value.lines.filter(
      (line: Partial<Line> | null) =>
        !!line &&
        typeof line.variant_id === "string" &&
        typeof line.quantity === "number" &&
        line.quantity > 0 &&
        typeof line.title === "string"
    )
    const customer = { ...EMPTY_CUSTOMER }
    for (const field of Object.keys(EMPTY_CUSTOMER) as (keyof CustomerForm)[]) {
      if (typeof value.customer[field] === "string") {
        customer[field] = value.customer[field]
      }
    }
    const source =
      value.source && typeof value.source.source_cart_id === "string"
        ? (value.source as StoreCartPrefill)
        : null
    return {
      lines,
      customer,
      source,
      currency: typeof value.currency === "string" ? value.currency : "hnl",
    }
  } catch {
    return null
  }
}

/** A storefront cart as the form's starting point. */
export const fromStoreCart = (
  cart: StoreCartPrefill
): { lines: Line[]; customer: CustomerForm } => {
  const address = cart.shipping_address
  return {
    lines: cart.items
      .filter((item) => !!item.variant_id)
      .map((item) => ({
        variant_id: item.variant_id as string,
        quantity: item.quantity,
        title: item.title,
        variant_title: item.variant_title,
        thumbnail: item.thumbnail,
        price: item.unit_price,
        // Unknown here; the review checks stock for real.
        available: null,
        allow_backorder: false,
      })),
    customer: {
      full_name: address?.full_name ?? "",
      phone: address?.phone ?? "",
      email: cart.email ?? "",
      city: address?.city ?? "",
      province: address?.province ?? "",
      address_1: address?.address_1 ?? "",
      address_2: address?.address_2 ?? "",
      company: address?.company ?? "",
      country_code: address?.country_code || "hn",
    },
  }
}
