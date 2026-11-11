import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

// The delivery company charges 5% on cash-on-delivery orders. Shared by the
// checkout warning and the WhatsApp message so both always quote the same figure.
export const CONTRA_ENTREGA_SURCHARGE_RATE = 0.05

// Rounded to 2 decimals so what the warning shows and what the message sends
// can never differ by a float artefact. Cart amounts are in major units.
export function contraEntregaSurcharge(total: number | null | undefined) {
  return Math.round((total ?? 0) * CONTRA_ENTREGA_SURCHARGE_RATE * 100) / 100
}

// Builds the pre-filled WhatsApp message for the "coordinar pago contra
// entrega" flow. Everything comes from the cart that's already in memory at the
// payment step — no backend call, no order is created. The customer just taps
// send and the owner gets the full order to coordinate delivery + cash payment.
//
// HN address mapping (see the checkout shipping-address component):
// city = Poblado/Municipio, province = Departamento, address_1 = Dirección
// exacta, address_2 = Referencia 1, company = Referencia 2.
export function buildContraEntregaMessage(cart: HttpTypes.StoreCart): string {
  const currency_code = cart.currency_code

  const itemLines = (cart.items ?? []).map((item) => {
    const talla = item.variant?.title ? ` — Talla ${item.variant.title}` : ""
    return `${item.quantity}× ${item.product_title}${talla}`
  })

  const money = (amount: number) => convertToLocale({ amount, currency_code })

  // The cart total doesn't include the delivery company's cash-on-delivery
  // fee, so it's added here as its own line and folded into the final total.
  const baseTotal = cart.total ?? 0
  const surcharge = contraEntregaSurcharge(baseTotal)
  const totalLines =
    surcharge > 0
      ? [
          `Total sin recargo: ${money(baseTotal)}`,
          `Recargo contra entrega (${CONTRA_ENTREGA_SURCHARGE_RATE * 100}%): ${money(surcharge)}`,
          `Total a pagar: ${money(baseTotal + surcharge)}`,
        ]
      : [`Total: ${money(baseTotal)}`]

  const addr = cart.shipping_address
  const deliveryLines: string[] = []

  if (addr) {
    const fullName = [addr.first_name, addr.last_name].filter(Boolean).join(" ")
    if (fullName) deliveryLines.push(fullName)
    if (addr.phone) deliveryLines.push(`Tel: ${addr.phone}`)

    // Dirección exacta (address_1).
    if (addr.address_1) deliveryLines.push(addr.address_1)

    // Poblado/Municipio (city) + Departamento (province).
    const cityLine = [addr.city, addr.province].filter(Boolean).join(", ")
    if (cityLine) deliveryLines.push(cityLine)

    // Referencias (address_2 + company).
    const references = [addr.address_2, addr.company].filter(Boolean).join(" / ")
    if (references) deliveryLines.push(`Ref: ${references}`)
  }

  const sections: string[] = [
    "Hola, quiero coordinar pago contra entrega",
    `Mi pedido:\n${itemLines.join("\n")}`,
    totalLines.join("\n"),
  ]

  if (deliveryLines.length) {
    sections.push(`Entrega:\n${deliveryLines.join("\n")}`)
  }

  if (cart.id) {
    sections.push(`Pedido #: ${cart.id}`)
  }

  return sections.join("\n\n")
}
