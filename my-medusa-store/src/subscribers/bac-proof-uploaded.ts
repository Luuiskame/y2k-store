import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type EventData = {
  order_id: string
  proof_files?: { url: string; uploaded_at: string }[]
}

export default async function bacProofUploadedHandler({
  event,
  container,
}: SubscriberArgs<EventData>) {
  const orderId = event.data.order_id
  const proofUrls = (event.data.proof_files ?? []).map((p) => p.url)

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notification = container.resolve(Modules.NOTIFICATION)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "total",
      "shipping_address.first_name",
      "shipping_address.last_name",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0]
  if (!order) {
    logger.warn(`bac-proof-uploaded: order ${orderId} not found`)
    return
  }

  const firstName = order.shipping_address?.first_name ?? undefined
  const lastName = order.shipping_address?.last_name ?? undefined
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || undefined

  const totalLabel = formatCurrency(order.total, order.currency_code)

  const ownerEmail = process.env.STORE_OWNER_EMAIL
  const adminBaseUrl =
    process.env.MEDUSA_ADMIN_URL ??
    process.env.MEDUSA_BACKEND_URL ??
    "http://localhost:9000"
  const adminUrl = `${adminBaseUrl.replace(/\/$/, "")}/app/orders/${orderId}`

  const notifications: any[] = []

  if (order.email) {
    notifications.push({
      to: order.email,
      channel: "email",
      template: "bac-proof-received-customer",
      data: {
        first_name: firstName,
        order_display_id: order.display_id,
        total_label: totalLabel,
      },
    })
  }

  if (ownerEmail) {
    notifications.push({
      to: ownerEmail,
      channel: "email",
      template: "bac-proof-received-owner",
      data: {
        order_id: orderId,
        order_display_id: order.display_id,
        customer_name: fullName,
        customer_email: order.email,
        total_label: totalLabel,
        admin_url: adminUrl,
        proof_urls: proofUrls,
      },
    })
  }

  if (notifications.length === 0) {
    return
  }

  try {
    await notification.createNotifications(notifications)
  } catch (err) {
    logger.error(
      `bac-proof-uploaded: failed to send notifications for order ${orderId}: ${err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "bac_transfer.proof_uploaded",
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
