import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

import { getBacTransferStatus } from "./bac-transfer"

// Pre-filled WhatsApp message for a customer who needs help with a bank
// transfer that's still pending. Same idea as the contra-entrega message at
// checkout: the owner should be able to find the order without asking anything
// back, so we send the display id, the amount and where the customer got stuck.
export function buildBacHelpMessage(order: HttpTypes.StoreOrder): string {
  const status = getBacTransferStatus(order)

  const total = convertToLocale({
    amount: order.total ?? 0,
    currency_code: order.currency_code ?? "hnl",
  })

  const statusLabel =
    status === "proof_uploaded"
      ? "Ya subí mi comprobante y espero la verificación."
      : "Todavía no he subido mi comprobante."

  return [
    "Hola, necesito ayuda con mi transferencia BAC.",
    `Pedido #${order.display_id}\nTotal: ${total}`,
    statusLabel,
    `Ref: ${order.id}`,
  ].join("\n\n")
}
