import { Lang, dateLocale, getLang } from "../i18n/lang"
import { tr } from "../i18n/tr"
import type { Granularity, ProductCard } from "./analytics"

/**
 * Money and plain numbers are written the Honduran way in both languages
 * ("L 4,500.00"): it is the store's currency, not a matter of language.
 * Dates and words follow the language in use; see `formatsOf` below.
 */
const NUMBER_LOCALE = "es-HN"

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
    format = new Intl.NumberFormat(NUMBER_LOCALE, {
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

const numberFormat = new Intl.NumberFormat(NUMBER_LOCALE)
const compactNumberFormat = new Intl.NumberFormat(NUMBER_LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
})

export const formatNumber = (value: number, { compact = false } = {}) =>
  (compact ? compactNumberFormat : numberFormat).format(value)

const percentFormat = new Intl.NumberFormat(NUMBER_LOCALE, {
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

type DateFormats = {
  day: Intl.DateTimeFormat
  longDay: Intl.DateTimeFormat
  month: Intl.DateTimeFormat
  hour: Intl.DateTimeFormat
  stamp: Intl.DateTimeFormat
  regions: Intl.DisplayNames | null
}

const dateFormats = new Map<Lang, DateFormats>()

/** The date formatters of the language in use, built the first time. */
const formatsOf = (): DateFormats => {
  const lang = getLang()
  let formats = dateFormats.get(lang)
  if (!formats) {
    const locale = dateLocale(lang)
    let regions: Intl.DisplayNames | null = null
    try {
      regions = new Intl.DisplayNames([locale], { type: "region" })
    } catch {
      // An old browser: country codes are shown as they come.
    }
    formats = {
      day: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }),
      longDay: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      month: new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }),
      hour: new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" }),
      stamp: new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Tegucigalpa",
      }),
      regions,
    }
    dateFormats.set(lang, formats)
  }
  return formats
}

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
  (long ? formatsOf().longDay : formatsOf().day).format(dayUtc(day))

export const formatBucket = (
  bucket: string,
  granularity: Granularity,
  { day, long = false }: { day?: string; long?: boolean } = {}
): string => {
  if (granularity === "hour") {
    const hour = formatsOf().hour.format(Date.UTC(2000, 0, 1, Number(bucket)))
    return day && long ? `${formatDay(day, { long: true })}, ${hour}` : hour
  }
  if (granularity === "month") {
    return formatsOf().month.format(dayUtc(bucket))
  }
  return formatDay(bucket, { long })
}

export const formatRange = (from: string, to: string) =>
  from === to ? formatDay(from, { long: true }) : `${formatDay(from)} – ${formatDay(to)}`

/** A moment as the store's clock reads it: "11 nov 2026, 3:42 p. m.". */
export const formatStamp = (date: Date | number) => formatsOf().stamp.format(date)

/** `4 min`, `1 h 12 min`; under a minute reads as such. */
export const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) {
    return tr().analytics.format.underAMinute
  }
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export const countryName = (code: string) => {
  try {
    return formatsOf().regions?.of(code) ?? code
  } catch {
    return code
  }
}

/** Regional-indicator flag for an ISO country code: HN → 🇭🇳. */
export const flagOf = (code: string | null | undefined) =>
  code && /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : ""

/** Names that are the same in every language; the rest are in the dictionary. */
const SOURCE_BRANDS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  google: "Google",
  youtube: "YouTube",
}

export const sourceLabel = (key: string) =>
  tr().analytics.format.sources[key] ?? SOURCE_BRANDS[key] ?? key

export const deviceLabel = (key: string) => tr().analytics.format.devices[key] ?? key

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
  const words = tr().analytics.format
  if (words.pages[path]) {
    return words.pages[path]
  }
  const [, first, ...rest] = path.split("/")
  switch (first) {
    case "products":
      return words.product(prettySlug(rest[0] ?? ""))
    case "categories":
      return words.category(prettySlug(rest[rest.length - 1] ?? ""))
    case "collections":
      return words.collection(prettySlug(rest[0] ?? ""))
    case "account":
      return words.account
  }
  return path
}

/** Short description of what a visitor is doing, for the live list. */
export const activityLabel = (pageType: string): string => {
  const { activity } = tr().analytics.format
  switch (pageType) {
    case "product":
      return activity.product
    case "cart":
      return activity.cart
    case "checkout":
      return activity.checkout
    case "purchase":
      return activity.purchase
    case "catalog":
    case "category":
    case "collection":
      return activity.catalog
    case "home":
      return activity.home
    case "account":
      return activity.account
    default:
      return activity.other
  }
}

export const paymentMethodLabel = (providerId: string | null) => {
  const { payment } = tr().analytics.format
  if (!providerId) {
    return payment.none
  }
  if (providerId.startsWith("pp_transferencia-bac")) {
    return payment.bac
  }
  if (providerId.startsWith("pp_contra-entrega")) {
    return payment.cashOnDelivery
  }
  if (providerId.startsWith("pp_system_default")) {
    return payment.manual
  }
  if (providerId.startsWith("pp_stripe") || providerId.startsWith("pp_medusa-")) {
    return payment.card
  }
  return providerId
}
