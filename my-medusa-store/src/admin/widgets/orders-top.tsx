import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Plus } from "@medusajs/icons"
import { Button, Container, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"

import { MobileOrders } from "../components/mobile/orders-list"
import { SalesAlertsBanner } from "../components/push/sales-alerts"
import { useAccountTheme } from "../lib/theme-sync"
import { useIsPhone } from "../lib/use-media"
import "../theme/boot"

/**
 * Top of the orders page, which is where the Home Screen app opens.
 *
 * - The offer to turn sales alerts on, while there is something to do about
 *   them (see SalesAlertsBanner).
 * - On a phone, the orders as cards; Medusa's table below is hidden.
 * - On a computer, the way into "Nuevo pedido", for the sales that come in
 *   over WhatsApp and never pass through the storefront's checkout.
 */
const OrdersTopWidget = () => {
  const phone = useIsPhone()
  // The app opens here: where a new phone picks up the account's look.
  useAccountTheme()

  return (
    <>
      <SalesAlertsBanner />
      {phone ? (
        <MobileOrders />
      ) : (
        <Container className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-col gap-1">
            <Text size="small" leading="compact" weight="plus">
              ¿Venta por WhatsApp o contra entrega?
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Registrá el pedido desde aquí, sin comprarlo vos en la tienda.
            </Text>
          </div>
          <Button size="small" className="shrink-0" asChild>
            <Link to="/nuevo-pedido">
              <Plus />
              Nuevo pedido
            </Link>
          </Button>
        </Container>
      )}
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default OrdersTopWidget
