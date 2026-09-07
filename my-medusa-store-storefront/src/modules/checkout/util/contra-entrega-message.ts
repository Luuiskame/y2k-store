import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

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

  const total = convertToLocale({
    amount: cart.total ?? 0,
    currency_code,
  })

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
    `Total: ${total}`,
  ]

  if (deliveryLines.length) {
    sections.push(`Entrega:\n${deliveryLines.join("\n")}`)
  }

  if (cart.id) {
    sections.push(`Pedido #: ${cart.id}`)
  }

  return sections.join("\n\n")
}
