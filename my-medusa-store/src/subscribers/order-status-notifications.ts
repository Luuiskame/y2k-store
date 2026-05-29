import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

// shipment.created / delivery.created carry a FULFILLMENT id.
// order.canceled carries the ORDER id.
type EventData = {
  id: string
  no_notification?: boolean
}

type ResolvedOrder = {
  id: string
  display_id?: number
  email?: string
  shipping_address?: { first_name?: string }
}

type ResolvedFulfillment = {
  id: string
  labels?: { tracking_number?: string; tracking_url?: string }[]
  order?: ResolvedOrder
}

export default async function orderStatusNotificationHandler({
  event,
  container,
}: SubscriberArgs<EventData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notification = container.resolve(Modules.NOTIFICATION)

  const eventName = event.name

  // Admin can opt out of notifying the customer when creating a shipment.
  if (eventName === "shipment.created" && event.data.no_notification) {
    return
  }

  let order: ResolvedOrder | undefined
  let fulfillment: ResolvedFulfillment | undefined

  if (eventName === "order.canceled") {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "shipping_address.first_name",
      ],
      filters: { id: event.data.id },
    })
    order = orders?.[0] as unknown as ResolvedOrder | undefined
  } else {
    // shipment.created / delivery.created → resolve the order via the fulfillment
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "labels.tracking_number",
        "labels.tracking_url",
        "order.id",
        "order.display_id",
        "order.email",
        "order.shipping_address.first_name",
      ],
      filters: { id: event.data.id },
    })
    fulfillment = fulfillments?.[0] as unknown as ResolvedFulfillment | undefined
    order = fulfillment?.order
  }

  if (!order || !order.email) {
    logger.warn(
      `order-status-notifications: no order/email for ${eventName} (${event.data.id})`
    )
    return
  }

  const first_name = order.shipping_address?.first_name ?? undefined
  const order_display_id = order.display_id

  let template: string
  let data: Record<string, unknown>

  switch (eventName) {
    case "shipment.created": {
      const labels = fulfillment?.labels ?? []
      template = "order-shipped-customer"
      data = {
        first_name,
        order_display_id,
        tracking_numbers: labels
          .map((l) => l.tracking_number)
          .filter(Boolean),
        tracking_url: labels.find((l) => l.tracking_url)?.tracking_url,
      }
      break
    }
    case "delivery.created": {
      template = "order-delivered-customer"
      data = { first_name, order_display_id }
      break
    }
    case "order.canceled": {
      template = "order-canceled-customer"
      data = {
        first_name,
        order_display_id,
      }
      break
    }
    default:
      return
  }

  try {
    await notification.createNotifications({
      to: order.email,
      channel: "email",
      template,
      data,
    })
  } catch (err) {
    logger.error(
      `order-status-notifications: failed to email customer for ${eventName} order ${order.id}: ${err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["shipment.created", "delivery.created", "order.canceled"],
}
