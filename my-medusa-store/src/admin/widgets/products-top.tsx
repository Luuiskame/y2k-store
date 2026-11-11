import { defineWidgetConfig } from "@medusajs/admin-sdk"

import { MobileProducts } from "../components/mobile/products-list"
import { useIsPhone } from "../lib/use-media"
import "../theme/boot"

/**
 * On a phone, the products as cards with every size and what is left of it;
 * Medusa's table below is hidden. On a computer, nothing: the table is fine.
 */
const ProductsTopWidget = () => (useIsPhone() ? <MobileProducts /> : null)

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default ProductsTopWidget
