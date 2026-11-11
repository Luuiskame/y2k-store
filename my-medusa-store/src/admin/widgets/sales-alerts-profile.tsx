import { defineWidgetConfig } from "@medusajs/admin-sdk"

import { SalesAlertsCard } from "../components/push/sales-alerts"

/** Ajustes → Perfil: alerts are per person and per device. */
const SalesAlertsProfileWidget = () => <SalesAlertsCard />

export const config = defineWidgetConfig({
  zone: "profile.details.after",
})

export default SalesAlertsProfileWidget
