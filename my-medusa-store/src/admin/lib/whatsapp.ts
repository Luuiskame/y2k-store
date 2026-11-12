/**
 * From a phone number as a customer typed it to a WhatsApp chat.
 *
 * `wa.me` wants the full international number, digits only. Customers type
 * anything: "9876-5432", "+504 9876 5432", "504 98765432", "0050498765432",
 * and now and then a number from abroad. Most are Honduran, so a bare
 * eight-digit number is read as one; a number that says where it is from
 * (a "+", a "00", or the country's own prefix) is taken at its word; and the
 * country of the delivery address settles the rest.
 *
 * Pure (no DOM), unit-tested in lib/__tests__/whatsapp.unit.spec.ts.
 */

type Plan = {
  /** Country calling code. */
  code: string
  /** Lengths a national number can have, without the calling code. */
  lengths: number[]
  /** Digit dialed before a national number inside the country, if any. */
  trunk?: string
}

/** Where the store's customers can plausibly be. ISO 3166-1 alpha-2 → plan. */
const PLANS: Record<string, Plan> = {
  hn: { code: "504", lengths: [8] },
  gt: { code: "502", lengths: [8] },
  sv: { code: "503", lengths: [8] },
  ni: { code: "505", lengths: [8] },
  cr: { code: "506", lengths: [8] },
  pa: { code: "507", lengths: [8, 7] },
  bz: { code: "501", lengths: [7] },
  mx: { code: "52", lengths: [10] },
  us: { code: "1", lengths: [10] },
  ca: { code: "1", lengths: [10] },
  pr: { code: "1", lengths: [10] },
  do: { code: "1", lengths: [10] },
  co: { code: "57", lengths: [10] },
  ve: { code: "58", lengths: [10], trunk: "0" },
  ec: { code: "593", lengths: [9], trunk: "0" },
  pe: { code: "51", lengths: [9] },
  bo: { code: "591", lengths: [8] },
  cl: { code: "56", lengths: [9] },
  ar: { code: "54", lengths: [10, 11], trunk: "0" },
  uy: { code: "598", lengths: [8, 9], trunk: "0" },
  py: { code: "595", lengths: [9], trunk: "0" },
  br: { code: "55", lengths: [10, 11], trunk: "0" },
  es: { code: "34", lengths: [9] },
  gb: { code: "44", lengths: [10], trunk: "0" },
  fr: { code: "33", lengths: [9], trunk: "0" },
  de: { code: "49", lengths: [10, 11], trunk: "0" },
  it: { code: "39", lengths: [9, 10] },
}

const HOME = "hn"

export type WhatsappNumber = {
  /** What goes after `wa.me/`: country code and number, digits only. */
  digits: string
  /** For people: "+504 9876-5432". */
  display: string
  /**
   * False when the country had to be guessed. The number still opens a
   * chat, but it is worth a look before sending.
   */
  certain: boolean
}

const group = (digits: string): string => {
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim()
}

const display = (code: string, national: string) => `+${code} ${group(national)}`

/** The plan whose calling code these international digits start with. */
const planOfInternational = (digits: string): Plan | undefined => {
  // Longest code first, so 504 is not read as a number in "5".
  const plans = Object.values(PLANS).sort((a, b) => b.code.length - a.code.length)
  return plans.find(
    (plan) =>
      digits.startsWith(plan.code) &&
      plan.lengths.includes(digits.length - plan.code.length)
  )
}

const international = (digits: string, certain: boolean): WhatsappNumber => {
  const plan = planOfInternational(digits)
  return {
    digits,
    display: plan
      ? display(plan.code, digits.slice(plan.code.length))
      : `+${group(digits)}`,
    certain,
  }
}

/**
 * The WhatsApp number behind what was typed, or null when there is no
 * usable number in it. `countryCode` is the delivery address's country.
 */
export const toWhatsappNumber = (
  raw: string | null | undefined,
  countryCode?: string | null
): WhatsappNumber | null => {
  const typed = (raw ?? "").trim()
  if (!typed) {
    return null
  }

  // Two numbers in one field ("9876-5432 / 3344-5566"): the first one. An
  // extension ("ext. 12", "x12") is not part of what WhatsApp dials.
  const main = typed
    .split(/\s*(?:[/,;]|\s[yo]\s)\s*/i)[0]
    .split(/\s*(?:ext\.?|x)\s*\d+\s*$/i)[0]
  const saysInternational = /^\s*(\+|00)/.test(main)
  let digits = main.replace(/\D/g, "")

  if (saysInternational) {
    if (main.trim().startsWith("00")) {
      digits = digits.replace(/^00/, "")
    }
    // E.164 allows up to 15 digits; under 8 there is no country plus number.
    return digits.length >= 8 && digits.length <= 15
      ? international(digits, true)
      : null
  }

  if (digits.length < 7 || digits.length > 15) {
    return null
  }

  const country = (countryCode ?? "").toLowerCase()
  const local = PLANS[country]

  if (local) {
    // Already carries its country's code: "504 9876 5432".
    if (
      digits.startsWith(local.code) &&
      local.lengths.includes(digits.length - local.code.length)
    ) {
      return international(digits, true)
    }
    const national =
      local.trunk && digits.startsWith(local.trunk)
        ? digits.slice(local.trunk.length)
        : digits
    if (local.lengths.includes(national.length)) {
      return {
        digits: local.code + national,
        display: display(local.code, national),
        certain: true,
      }
    }
  }

  // The address is from somewhere else, or says nothing. The store is in
  // Honduras: a bare eight-digit number is almost surely Honduran.
  const home = PLANS[HOME]
  if (home.lengths.includes(digits.length)) {
    return {
      digits: home.code + digits,
      display: display(home.code, digits),
      certain: !country || country === HOME,
    }
  }

  // Long enough to carry a country code of its own.
  const known = planOfInternational(digits)
  if (known) {
    return international(digits, true)
  }
  if (digits.length >= 11) {
    return international(digits, false)
  }
  // Ten digits with no country to go by: the usual case is a relative's
  // number in the United States. A guess, and marked as one.
  if (digits.length === 10) {
    return { digits: "1" + digits, display: display("1", digits), certain: false }
  }

  return null
}

/** The link that opens the chat, with a message ready to send if given. */
export const whatsappUrl = (digits: string, message?: string): string =>
  `https://wa.me/${digits}${
    message ? `?text=${encodeURIComponent(message)}` : ""
  }`

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

export type MessageOrder = {
  display_id: number | null
  first_name: string
  /** Already formatted: "L 1,880.00". */
  total: string
  /** Formatted cash to collect, for contra entrega; null otherwise. */
  collect_total: string | null
  items: { title: string; variant_title: string | null; quantity: number }[]
  /** One line: street, town, department. */
  address: string
}

/**
 * What each one is called and what it is for is the owner's reading, and is
 * translated: `t.orders.whatsapp.templates[id]`. The message itself is the
 * customer's, and is always in Spanish.
 */
export type MessageTemplate = {
  id: "saludo" | "confirmar" | "en-camino" | "coordinar" | "comprobante"
  build: (order: MessageOrder, storeName: string) => string
}

const greeting = (order: MessageOrder) =>
  order.first_name ? `Hola ${order.first_name}` : "Hola"

const orderRef = (order: MessageOrder) =>
  order.display_id ? `tu pedido #${order.display_id}` : "tu pedido"

const itemLines = (order: MessageOrder) =>
  order.items
    .map(
      (item) =>
        `${item.quantity}× ${item.title}${
          item.variant_title ? ` (${item.variant_title})` : ""
        }`
    )
    .join("\n")

/**
 * Ready-made messages for the moments an order needs a word with the
 * customer. The first one is what the WhatsApp button itself sends.
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "saludo",
    build: (order, store) =>
      `${greeting(order)}, te escribimos de ${store} por ${orderRef(order)}.`,
  },
  {
    id: "confirmar",
    build: (order, store) =>
      [
        `${greeting(order)}, te escribimos de ${store} para confirmar ${orderRef(order)}:`,
        itemLines(order),
        order.collect_total
          ? `Total a pagar al recibir: ${order.collect_total}`
          : `Total: ${order.total}`,
        order.address ? `Entrega: ${order.address}` : "",
        "¿Está todo correcto?",
      ]
        .filter(Boolean)
        .join("\n\n"),
  },
  {
    id: "en-camino",
    build: (order, store) =>
      `${greeting(order)}, ${orderRef(order)} de ${store} ya va en camino.${
        order.collect_total
          ? ` Tené listos ${order.collect_total} para pagar al recibir.`
          : ""
      }`,
  },
  {
    id: "coordinar",
    build: (order, store) =>
      `${greeting(order)}, te escribimos de ${store}. ¿A qué hora te queda bien recibir ${orderRef(order)}?`,
  },
  {
    id: "comprobante",
    build: (order, store) =>
      `${greeting(order)}, te escribimos de ${store}. Para preparar ${orderRef(order)} nos falta el comprobante de la transferencia por ${order.total}. ¿Nos lo mandás por aquí?`,
  },
]
