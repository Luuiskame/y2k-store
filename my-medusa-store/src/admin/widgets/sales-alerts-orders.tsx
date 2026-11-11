import { defineWidgetConfig } from "@medusajs/admin-sdk"

import { SalesAlertsBanner } from "../components/push/sales-alerts"

/**
 * The orders list is where the Home Screen app opens, so this is where the
 * owner is offered alerts on the device in hand.
 */
const SalesAlertsOrdersWidget = () => <SalesAlertsBanner />

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default SalesAlertsOrdersWidget
