import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"

import { OrderContact } from "../components/orders/order-contact"
import "../theme/boot"

/** First thing on an order: the customer, WhatsApp, and what is left to do. */
const OrderContactWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => (
  <OrderContact order={order} />
)

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderContactWidget
