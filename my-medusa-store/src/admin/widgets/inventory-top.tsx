import { defineWidgetConfig } from "@medusajs/admin-sdk"

import { MobileInventory } from "../components/mobile/inventory-list"
import { useIsPhone } from "../lib/use-media"
import "../theme/boot"

/**
 * On a phone, stock by product and size with a minus and a plus; Medusa's
 * table below is hidden. On a computer, nothing: the table is fine.
 */
const InventoryTopWidget = () => (useIsPhone() ? <MobileInventory /> : null)

export const config = defineWidgetConfig({
  zone: "inventory_item.list.before",
})

export default InventoryTopWidget
