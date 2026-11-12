import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  AlertSource,
  OrderAlertDetails,
  getVapidConfig,
  newOrderAlert,
  proofReceivedAlert,
  sendAdminAlert,
} from "../lib/admin-push"
import type { ProofFile } from "../lib/bac-proof"

type EventData = {
  /** `order.placed` */
  id?: string
  /** `bac_transfer.proof_uploaded` */
  order_id?: string
  proof_files?: ProofFile[]
}

/**
 * Pushes the two sales moments to the admin's devices (see
 * `lib/admin-push.ts`): an order came in, and a customer uploaded the receipt
 * of a BAC transfer, which leaves the order waiting for someone to confirm the
 * payment. Receipts also go out by email (`bac-proof-uploaded.ts`); new orders
 * only come through here.
 */
export default async function adminPushAlertsHandler({
  event,
  container,
}: SubscriberArgs<EventData>) {
  // No keys, nothing could be delivered: stay quiet (local dev).
  if (!getVapidConfig()) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const isNewOrder = event.name === "order.placed"
  const orderId = isNewOrder ? event.data.id : event.data.order_id
  if (!orderId) {
    return
  }

  try {
    const order = await loadOrder(container, orderId)
    if (!order) {
      logger.warn(`admin-push: order ${orderId} not found for ${event.name}`)
      return
    }

    // Each admin user reads it in the language their panel is in.
    let alert: AlertSource
    if (isNewOrder) {
      alert = (lang) => newOrderAlert(order, lang)
    } else {
      // Same rule as the receipt email: a canceled order has nothing left to
      // verify, so a receipt on it is a mistake or abuse.
      if (order.status === "canceled") {
        return
      }
      const files = event.data.proof_files?.length ?? 0
      alert = (lang) => proofReceivedAlert(order, files, lang)
    }

    const delivery = await sendAdminAlert(container, alert)
    logger.info(
      `admin-push: ${event.name} for order ${orderId}: ${delivery.sent} sent, ${delivery.removed} expired, ${delivery.failed} failed`
    )
  } catch (err) {
    // An alert must never get in the way of the order itself.
    logger.error(
      `admin-push: could not send the ${event.name} alert for order ${orderId}: ${err}`
    )
  }
}

const loadOrder = async (
  container: MedusaContainer,
  orderId: string
): Promise<OrderAlertDetails | undefined> => {
  const orderModule = container.resolve(Modules.ORDER)

  // The Order module service, not query.graph, so `total` comes computed (the
  // other order subscribers do the same).
  let order: any
  try {
    order = await orderModule.retrieveOrder(orderId, {
      select: ["id", "display_id", "status", "currency_code", "total"],
      relations: ["items", "shipping_address"],
    })
  } catch {
    return undefined
  }

  const address = order.shipping_address
  const items: { quantity?: unknown }[] = order.items ?? []

  return {
    id: order.id,
    display_id: order.display_id,
    status: order.status,
    currency_code: order.currency_code,
    total: order.total,
    customer_name:
      [address?.first_name, address?.last_name].filter(Boolean).join(" ") ||
      undefined,
    city: address?.city || undefined,
    item_count: items.reduce(
      (count, item) => count + (Number(item.quantity) || 0),
      0
    ),
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "bac_transfer.proof_uploaded"],
}
