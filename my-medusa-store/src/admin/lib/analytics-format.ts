import type { Granularity, ProductCard } from "./analytics"

const LOCALE = "es-HN"

const moneyFormats = new Map<string, Intl.NumberFormat>()

/** `L 4,500.00`, or `L 4.5 K` for axis ticks. */
export const formatMoney = (
  amount: number,
  currency: string,
  { compact = false }: { compact?: boolean } = {}
): string => {
  const key = `${currency}:${compact}`
  let format = moneyFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: currency.toUpperCase(),
      ...(compact
        ? { notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 }
        : {}),
    })
    moneyFormats.set(key, format)
  }
  return format.format(amount)
}

const numberFormat = new Intl.NumberFormat(LOCALE)
const compactNumberFormat = new Intl.NumberFormat(LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
})

export const formatNumber = (value: number, { compact = false } = {}) =>
  (compact ? compactNumberFormat : numberFormat).format(value)

const percentFormat = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 1,
})

export const formatPercent = (ratio: number) => percentFormat.format(ratio)

/** `part / whole`, or null when there is no whole to be a share of. */
export const ratioOf = (part: number, whole: number): number | null =>
  whole > 0 ? part / whole : null

/**
 * Relative change from `previous` to `current`. Null when there was nothing
 * before: going from 0 to 3 is not "+∞ %", it is just new.
 */
export const changeOf = (current: number, previous: number): number | null =>
  previous > 0 ? (current - previous) / previous : null

const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})
const longDayFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})
const hourFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: "numeric",
  timeZone: "UTC",
})

/**
 * Bucket keys are store-local already (`2026-09-27`, `2026-09`, `09`), so they
 * are formatted as UTC: formatting in the browser's zone would move a day
 * across midnight for an admin who is not in Honduras.
 */
const dayUtc = (day: string) => {
  const [y, m, d] = day.split("-").map(Number)
  return Date.UTC(y, m - 1, d ?? 1)
}

export const formatDay = (day: string, { long = false } = {}) =>
  (long ? longDayFormat : dayFormat).format(dayUtc(day))

export const formatBucket = (
  bucket: string,
  granularity: Granularity,
  { day, long = false }: { day?: string; long?: boolean } = {}
): string => {
  if (granularity === "hour") {
    const hour = hourFormat.format(Date.UTC(2000, 0, 1, Number(bucket)))
    return day && long ? `${formatDay(day, { long: true })}, ${hour}` : hour
  }
  if (granularity === "month") {
    return monthFormat.format(dayUtc(bucket))
  }
  return formatDay(bucket, { long })
}

export const formatRange = (from: string, to: string) =>
  from === to ? formatDay(from, { long: true }) : `${formatDay(from)} – ${formatDay(to)}`

/** `4 min`, `1 h 12 min`; under a minute reads as such. */
export const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) {
    return "menos de 1 min"
  }
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames([LOCALE], { type: "region" })
  } catch {
    return null
  }
})()

export const countryName = (code: string) => {
  try {
    return regionNames?.of(code) ?? code
  } catch {
    return code
  }
}

/** Regional-indicator flag for an ISO country code: HN → 🇭🇳. */
export const flagOf = (code: string | null | undefined) =>
  code && /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : ""

export const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  meta: "Facebook o Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  google: "Google",
  youtube: "YouTube",
  x: "X (Twitter)",
  buscadores: "Otros buscadores",
  email: "Correo",
  otro: "Otros sitios",
  directo: "Directo",
}

export const sourceLabel = (key: string) => SOURCE_LABELS[key] ?? key

export const DEVICE_LABELS: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computadora",
}

export const deviceLabel = (key: string) => DEVICE_LABELS[key] ?? key

const PAGE_LABELS: Record<string, string> = {
  "/": "Inicio",
  "/store": "Catálogo",
  "/cart": "Carrito",
  "/checkout": "Checkout",
  "/order/:id/confirmed": "Pedido confirmado",
  "/order/:id/transferencia-bac": "Datos de transferencia BAC",
  "/order/:id": "Traspaso de pedido",
  "/account": "Mi cuenta",
  "/envios": "Envíos",
  "/guia-de-tallas": "Guía de tallas",
  "/preguntas-frecuentes": "Preguntas frecuentes",
  "/sobre-nosotros": "Sobre nosotros",
  "/colaboraciones": "Colaboraciones",
  "/reset-password": "Restablecer contraseña",
  "/otra": "Otras páginas",
  "(otras)": "Otras páginas",
}

// The backend only lets `[a-z0-9_-]` into a path segment, so a slug needs no
// decoding, just spaces and a capital.
const prettySlug = (slug: string) => {
  const words = slug.replace(/[-_]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** What a normalized storefront path is called on the dashboard. */
export const pageLabel = (path: string, product?: ProductCard | null): string => {
  if (product) {
    return product.title
  }
  if (PAGE_LABELS[path]) {
    return PAGE_LABELS[path]
  }
  const [, first, ...rest] = path.split("/")
  switch (first) {
    case "products":
      return `Producto: ${prettySlug(rest[0] ?? "")}`
    case "categories":
      return `Categoría: ${prettySlug(rest[rest.length - 1] ?? "")}`
    case "collections":
      return `Colección: ${prettySlug(rest[0] ?? "")}`
    case "account":
      return "Mi cuenta"
  }
  return path
}

/** Short description of what a visitor is doing, for the live list. */
export const activityLabel = (pageType: string): string => {
  switch (pageType) {
    case "product":
      return "Viendo un producto"
    case "cart":
      return "En el carrito"
    case "checkout":
      return "En el checkout"
    case "purchase":
      return "Terminando su pedido"
    case "catalog":
    case "category":
    case "collection":
      return "Mirando el catálogo"
    case "home":
      return "En el inicio"
    case "account":
      return "En su cuenta"
    default:
      return "Navegando"
  }
}

export const paymentMethodLabel = (providerId: string | null) => {
  if (!providerId) {
    return "Sin pago registrado"
  }
  if (providerId.startsWith("pp_transferencia-bac")) {
    return "Transferencia BAC"
  }
  if (providerId.startsWith("pp_system_default")) {
    return "Pago manual"
  }
  if (providerId.startsWith("pp_stripe") || providerId.startsWith("pp_medusa-")) {
    return "Tarjeta"
  }
  return providerId
}
