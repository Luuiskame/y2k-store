/**
 * Words and colors for the states of an order, in the owner's terms rather
 * than Medusa's ("authorized" is money still to collect). Pure.
 */

export const STORE_NAME = "Y2K Fit"

/** The store's handle on Instagram, TikTok and Facebook. */
export const STORE_HANDLE = "@y2kfithn"

export type Tone = "green" | "orange" | "red" | "blue" | "grey" | "purple"

type Label = { label: string; tone: Tone }

const PAYMENT: Record<string, Label> = {
  not_paid: { label: "Sin pagar", tone: "red" },
  awaiting: { label: "Esperando pago", tone: "orange" },
  authorized: { label: "Por cobrar", tone: "orange" },
  partially_authorized: { label: "Por cobrar", tone: "orange" },
  requires_action: { label: "Pago por revisar", tone: "orange" },
  partially_captured: { label: "Cobrado en parte", tone: "orange" },
  captured: { label: "Cobrado", tone: "green" },
  partially_refunded: { label: "Reembolso parcial", tone: "grey" },
  refunded: { label: "Reembolsado", tone: "grey" },
  canceled: { label: "Pago cancelado", tone: "grey" },
}

const FULFILLMENT: Record<string, Label> = {
  not_fulfilled: { label: "Por despachar", tone: "red" },
  partially_fulfilled: { label: "Despacho parcial", tone: "orange" },
  fulfilled: { label: "Despachado", tone: "blue" },
  partially_shipped: { label: "Envío parcial", tone: "blue" },
  shipped: { label: "Enviado", tone: "blue" },
  partially_delivered: { label: "Entrega parcial", tone: "blue" },
  delivered: { label: "Entregado", tone: "green" },
  canceled: { label: "Envío cancelado", tone: "grey" },
}

export const paymentLabel = (status: string): Label =>
  PAYMENT[status] ?? { label: status, tone: "grey" }

export const fulfillmentLabel = (status: string): Label =>
  FULFILLMENT[status] ?? { label: status, tone: "grey" }

/** A short name for how an order is paid; null when nothing is known. */
export const paymentMethodName = (providerId: string | null): string | null => {
  if (!providerId) {
    return null
  }
  if (providerId.startsWith("pp_contra-entrega")) {
    return "Contra entrega"
  }
  if (providerId.startsWith("pp_transferencia-bac")) {
    return "Transferencia BAC"
  }
  if (providerId.startsWith("pp_system_default")) {
    return "Pago manual"
  }
  return null
}

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" })
const shortDate = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "short",
})
const shortDateYear = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

/**
 * "hace 5 minutos", "ayer", "9 nov": how long ago, and past a week simply
 * the date. `now` is a parameter so it can be tested.
 */
export const formatAgo = (iso: string, now: number = Date.now()): string => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) {
    return ""
  }
  const seconds = Math.round((now - then) / 1000)
  if (seconds < 45) {
    return "ahora"
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
  return rest > 0 ? `${shown.join(", ")} y ${rest} más` : shown.join(", ")
}
