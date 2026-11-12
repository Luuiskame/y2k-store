import { Lang, dateLocale, getLang } from "../i18n/lang"
import { tr } from "../i18n/tr"

/**
 * Words and colors for the states of an order, in the owner's terms rather
 * than Medusa's ("authorized" is money still to collect). Pure; the words
 * come from the dictionary of the language in use.
 */

export const STORE_NAME = "Y2K Fit"

/** The store's handle on Instagram, TikTok and Facebook. */
export const STORE_HANDLE = "@y2kfithn"

export type Tone = "green" | "orange" | "red" | "blue" | "grey" | "purple"

type Label = { label: string; tone: Tone }

const PAYMENT_TONES: Record<string, Tone> = {
  not_paid: "red",
  awaiting: "orange",
  authorized: "orange",
  partially_authorized: "orange",
  requires_action: "orange",
  partially_captured: "orange",
  captured: "green",
  partially_refunded: "grey",
  refunded: "grey",
  canceled: "grey",
}

const FULFILLMENT_TONES: Record<string, Tone> = {
  not_fulfilled: "red",
  partially_fulfilled: "orange",
  fulfilled: "blue",
  partially_shipped: "blue",
  shipped: "blue",
  partially_delivered: "blue",
  delivered: "green",
  canceled: "grey",
}

export const paymentLabel = (status: string): Label => ({
  label: tr().orders.payment[status] ?? status,
  tone: PAYMENT_TONES[status] ?? "grey",
})

export const fulfillmentLabel = (status: string): Label => ({
  label: tr().orders.fulfillment[status] ?? status,
  tone: FULFILLMENT_TONES[status] ?? "grey",
})

/** A short name for how an order is paid; null when nothing is known. */
export const paymentMethodName = (providerId: string | null): string | null => {
  if (!providerId) {
    return null
  }
  const { payment } = tr().analytics.format
  if (providerId.startsWith("pp_contra-entrega")) {
    return payment.cashOnDelivery
  }
  if (providerId.startsWith("pp_transferencia-bac")) {
    return payment.bac
  }
  if (providerId.startsWith("pp_system_default")) {
    return payment.manual
  }
  return null
}

type AgoFormats = {
  relative: Intl.RelativeTimeFormat
  shortDate: Intl.DateTimeFormat
  shortDateYear: Intl.DateTimeFormat
}

const agoFormats = new Map<Lang, AgoFormats>()

const formatsOf = (): AgoFormats => {
  const lang = getLang()
  let formats = agoFormats.get(lang)
  if (!formats) {
    const locale = dateLocale(lang)
    formats = {
      relative: new Intl.RelativeTimeFormat(lang, { numeric: "auto" }),
      shortDate: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
      shortDateYear: new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }
    agoFormats.set(lang, formats)
  }
  return formats
}

/**
 * "hace 5 minutos", "ayer", "9 nov": how long ago, and past a week simply
 * the date. `now` is a parameter so it can be tested.
 */
export const formatAgo = (iso: string, now: number = Date.now()): string => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return ""
  }
  const { relative, shortDate, shortDateYear } = formatsOf()
  const seconds = Math.round((now - then) / 1000)
  if (seconds < 45) {
    return tr().orders.justNow
  }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return relative.format(-minutes, "minute")
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return relative.format(-hours, "hour")
  }
  const days = Math.round(hours / 24)
  if (days < 7) {
    return relative.format(-days, "day")
  }
  const date = new Date(then)
  return date.getFullYear() === new Date(now).getFullYear()
    ? shortDate.format(date)
    : shortDateYear.format(date)
}

/** "2× Camiseta (M), 1× Hoodie": the lines of an order in one sentence. */
export const summarizeItems = (
  items: { title: string; variant_title: string | null; quantity: number }[],
  itemCount: number
): string => {
  const shown = items.map(
    (item) =>
      `${item.quantity}× ${item.title}${
        item.variant_title ? ` (${item.variant_title})` : ""
      }`
  )
  const shownUnits = items.reduce((count, item) => count + item.quantity, 0)
  const rest = itemCount - shownUnits
  return rest > 0 ? tr().orders.andMore(shown.join(", "), rest) : shown.join(", ")
}
