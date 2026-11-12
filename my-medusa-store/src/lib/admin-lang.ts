/**
 * The language the admin panel is being read in, as far as the server needs
 * to know it: Spanish (what every message here was written in) or English.
 *
 * The panel itself is translated in the browser (`src/admin/i18n`). Two
 * things are not, because the server writes them:
 *
 * - what a route answers when something goes wrong (`{ message }`), which
 *   the panel shows as is. The panel says which language it is in with a
 *   header on its own requests, and `englishBody` rewords the answer;
 * - the push alerts of a sale, which go out with nobody asking. For those
 *   the language is the one saved with the user's look (`y2k_theme.lang`).
 *
 * Messages are written once, in Spanish, where they are raised; this file
 * holds their English. Spanish is never touched, so a request without the
 * header (the storefront, an older panel) gets exactly what it always got.
 *
 * Pure: no framework, no I/O.
 */

export type AdminLang = "es" | "en"

/** Sent by the admin panel on its own requests (src/admin/lib/client.ts). */
export const ADMIN_LANG_HEADER = "x-y2k-lang"

type Headers = Record<string, string | string[] | undefined>

export const adminLangOf = (headers: Headers | undefined): AdminLang =>
  headers?.[ADMIN_LANG_HEADER] === "en" ? "en" : "es"

/** The language saved with a user's look; Spanish for anyone who never chose. */
export const adminLangOfMetadata = (
  metadata: Record<string, unknown> | null | undefined
): AdminLang => {
  const look = metadata?.y2k_theme
  return look && typeof look === "object" && (look as { lang?: unknown }).lang === "en"
    ? "en"
    : "es"
}

/** Every message an admin route can answer with, and its English. */
const ENGLISH: Record<string, string> = {
  // Nuevo pedido: Medusa's own failures, reworded (lib/manual-orders.ts).
  "No hay suficiente inventario de alguno de los productos. Revisá las cantidades.":
    "There is not enough stock of one of the products. Check the quantities.",
  "Algún producto no tiene precio en la moneda de la tienda.":
    "One of the products has no price in the store's currency.",
  "Ese método de envío no está disponible para esta dirección.":
    "That shipping method is not available for this address.",
  "Algún producto no está disponible en el canal de venta de la tienda.":
    "One of the products is not available in the store's sales channel.",
  "Ese pedido ya fue creado.": "That order has already been created.",
  "El código de descuento ya no es válido.": "The discount code is no longer valid.",
  "El pedido se está procesando. Esperá unos segundos e intentá de nuevo.":
    "The order is being processed. Wait a few seconds and try again.",

  // Nuevo pedido: what stands between a working cart and an order.
  "No se encontró el pedido en preparación. Volvé a revisarlo.":
    "The order being prepared was not found. Review it again.",
  "Ese carrito no se preparó desde el panel.": "That cart was not prepared from the panel.",
  "El pedido no tiene productos.": "The order has no products.",
  "Falta el teléfono del cliente.": "The customer's phone is missing.",
  "Falta la dirección de entrega.": "The delivery address is missing.",
  "Elegí un método de envío.": "Choose a shipping method.",
  "No se encontró ese carrito de la tienda.": "That storefront cart was not found.",
  "El teléfono debe tener al menos 7 dígitos.": "The phone must have at least 7 digits.",

  // Estadísticas.
  "No se pudo leer quién está en la tienda.": "Could not read who is on the store.",
  "No se pudieron leer las visitas en este momento.": "Could not read the visits right now.",
  "Las fechas deben tener el formato AAAA-MM-DD.": "Dates must be in the format YYYY-MM-DD.",
  "La fecha inicial es posterior a la final.": "The start date is after the end date.",

  // Transferencia BAC.
  "Pedido no encontrado.": "Order not found.",
  "Este pedido no usa transferencia BAC.": "This order does not use BAC transfer.",
  "No pudimos capturar el pago. Revisa los logs.":
    "We could not capture the payment. Check the logs.",

  // Alertas de ventas.
  "Las alertas no están configuradas en el servidor: faltan las variables WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY y WEB_PUSH_SUBJECT.":
    "Alerts are not configured on the server: the variables WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY and WEB_PUSH_SUBJECT are missing.",
  "Este navegador usa un servicio de notificaciones que no reconocemos.":
    "This browser uses a notification service we do not recognize.",
}

/** Messages with a value in them. */
const ENGLISH_PATTERNS: [RegExp, (match: RegExpExecArray) => string][] = [
  [
    /La tienda no vende a ese país \(([A-Za-z]{2})\)\. Revisá las regiones en Ajustes\./,
    (match) =>
      `The store does not sell to that country (${match[1]}). Check the regions in Settings.`,
  ],
  [/El rango máximo es de (\d+) días\./, (match) => `The maximum range is ${match[1]} days.`],
]

// Longest first: a sentence that contains another is replaced whole.
const SENTENCES = Object.keys(ENGLISH).sort((a, b) => b.length - a.length)

/**
 * A server message in English. One of ours is replaced, also inside a longer
 * text (Medusa wraps a validator's message in its own sentence); anything
 * else, which is Medusa's own English, comes back untouched.
 */
export const toEnglish = (message: string): string => {
  if (ENGLISH[message]) {
    return ENGLISH[message]
  }
  let text = message
  for (const sentence of SENTENCES) {
    if (text.includes(sentence)) {
      text = text.split(sentence).join(ENGLISH[sentence])
    }
  }
  for (const [pattern, english] of ENGLISH_PATTERNS) {
    const match = pattern.exec(text)
    if (match) {
      text = text.replace(match[0], english(match))
    }
  }
  return text
}

/** A JSON answer with its `message` in English; any other answer as it is. */
export const englishBody = (body: unknown): unknown => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body
  }
  const { message } = body as { message?: unknown }
  return typeof message === "string" ? { ...body, message: toEnglish(message) } : body
}
