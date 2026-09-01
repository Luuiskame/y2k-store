"use client"

import { whatsappLink } from "@lib/config/brand"
import { HttpTypes } from "@medusajs/types"
import WhatsApp from "@modules/common/icons/whatsapp"
import { buildBacHelpMessage } from "@modules/order/util/bac-help-message"

type Props = {
  order: HttpTypes.StoreOrder
  label?: string
}

/**
 * Opens WhatsApp with the customer's transfer already described (order number,
 * amount and whether they uploaded a proof), so nobody has to ask "¿cuál es tu
 * pedido?" before helping.
 */
const BacHelpButton = ({
  order,
  label = "Necesito ayuda con mi transferencia",
}: Props) => (
  <a
    href={whatsappLink(buildBacHelpMessage(order))}
    target="_blank"
    rel="noopener noreferrer"
    data-testid="bac-help-whatsapp-button"
    className="inline-flex w-full items-center justify-center gap-x-2 rounded-large px-4 py-3 text-sm font-medium text-brand-void-black transition-opacity hover:opacity-90"
    style={{ backgroundColor: "#25D366" }}
  >
    <WhatsApp size={18} className="shrink-0" />
    <span>{label}</span>
  </a>
)

export default BacHelpButton
