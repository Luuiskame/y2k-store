import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type EventData = {
  order_id: string
}

export default async function bacPaymentVerifiedHandler({
  event,
  container,
}: SubscriberArgs<EventData>) {
  const orderId = event.data.order_id

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModule = container.resolve(Modules.ORDER)
  const notification = container.resolve(Modules.NOTIFICATION)

  // Use the Order module service (not query.graph) so the computed `total`
  // is populated — query.graph returns a raw 0 for order totals.
  let order: any
  try {
    order = await orderModule.retrieveOrder(orderId, {
      select: ["id", "display_id", "email", "currency_code", "total"],
      relations: ["shipping_address"],
    })
  } catch {
    order = undefined
  }

  if (!order || !order.email) {
    logger.warn(`bac-payment-verified: order ${orderId} missing or has no email`)
    return
  }

  const totalLabel = formatCurrency(order.total, order.currency_code)

  try {
    await notification.createNotifications({
      to: order.email,
      channel: "email",
      template: "bac-payment-verified-customer",
      data: {
        first_name: order.shipping_address?.first_name ?? undefined,
        order_display_id: order.display_id,
        total_label: totalLabel,
      },
    })
  } catch (err) {
    logger.error(
      `bac-payment-verified: failed to email customer for order ${orderId}: ${err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "bac_transfer.payment_verified",
}

function formatCurrency(amount?: number, currencyCode?: string): string | undefined {
  if (amount == null) return undefined
  try {
    return new Intl.NumberFormat("es-HN", {
      style: "currency",
      currency: (currencyCode ?? "hnl").toUpperCase(),
    }).format(amount)
  } catch {
    return `${amount} ${currencyCode ?? ""}`.trim()
  }
}
