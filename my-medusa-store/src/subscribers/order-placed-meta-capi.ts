import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  buildPurchaseEvent,
  isMetaCapiConfigured,
  sendMetaConversionEvents,
} from "../lib/meta-capi"

/**
 * Sends a server-side Meta `Purchase` (Conversions API) when an order is placed.
 *
 * More reliable than the browser pixel (survives ad blockers / lost tabs) and
 * carries hashed customer PII for better match quality. Deduped against the
 * storefront pixel via `event_id = order.id`, so both firing is expected and
 * counts as one conversion.
 */
export default async function orderPlacedMetaCapiHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // No token/pixel configured (e.g. local dev) — stay quiet.
  if (!isMetaCapiConfigured()) {
    return
  }

  const orderId = event.data.id
  const orderModule = container.resolve(Modules.ORDER)

  // Use the Order module service (not query.graph) so the computed `total` is
  // populated — query.graph returns a raw 0 for order totals.
  let order: any
  try {
    order = await orderModule.retrieveOrder(orderId, {
      select: ["id", "email", "currency_code", "total", "customer_id"],
      relations: ["items", "shipping_address"],
    })
  } catch (err) {
    logger.error(`meta-capi: could not load order ${orderId}: ${err}`)
    return
  }

  if (!order) {
    logger.warn(`meta-capi: order ${orderId} not found`)
    return
  }

  try {
    const purchase = buildPurchaseEvent(order)
    const res = await sendMetaConversionEvents([purchase])

    if (res.ok) {
      logger.info(
        `meta-capi: Purchase sent for order ${orderId} (event_id=${order.id})`
      )
    } else {
      logger.error(
        `meta-capi: Purchase for order ${orderId} rejected (${res.status}): ${res.body}`
      )
    }
  } catch (err) {
    // Never throw from a subscriber — a tracking failure must not affect the order.
    logger.error(
      `meta-capi: failed to send Purchase for order ${orderId}: ${err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
