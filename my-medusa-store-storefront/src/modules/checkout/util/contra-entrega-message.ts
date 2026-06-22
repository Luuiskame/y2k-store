import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

// Builds the pre-filled WhatsApp message for the "coordinar pago contra
// entrega" flow. Everything comes from the cart that's already in memory at the
// payment step — no backend call, no order is created. The customer just taps
// send and the owner gets the full order to coordinate delivery + cash payment.
//
// HN address mapping (see project memory): province = Departamento,
// address_2 = Colonia, company = Referencias.
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

    // Colonia (address_2) + street (address_1) on one line when present.
    const streetLine = [addr.address_2, addr.address_1].filter(Boolean).join(", ")
    if (streetLine) deliveryLines.push(streetLine)

    // Ciudad + Departamento (province).
    const cityLine = [addr.city, addr.province].filter(Boolean).join(", ")
    if (cityLine) deliveryLines.push(cityLine)

    // Referencias (company).
    if (addr.company) deliveryLines.push(`Ref: ${addr.company}`)
  }

  const sections: string[] = [
    "Hola, quiero coordinar pago contra entrega 🖤",
    `🛒 Mi pedido:\n${itemLines.join("\n")}`,
    `💰 Total: ${total}`,
  ]

  if (deliveryLines.length) {
    sections.push(`📦 Entrega:\n${deliveryLines.join("\n")}`)
  }

  if (cart.id) {
    sections.push(`Pedido #: ${cart.id}`)
  }

  return sections.join("\n\n")
}
