"use client"

import { Button } from "@medusajs/ui"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-8 w-full">
        {orders.map((o) => (
          <div
            key={o.id}
            className="border-b border-brand-amethyst pb-6 last:pb-0 last:border-none"
          >
            <OrderCard order={o} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center text-center gap-y-3 py-8"
      data-testid="no-orders-container"
    >
      <h2 className="text-large-semi">Aún no hay pedidos</h2>
      <p className="text-base-regular text-brand-silver-ash max-w-sm">
        Cuando hagas tu primer pedido aparecerá aquí.
      </p>
      <div className="mt-2">
        <LocalizedClientLink href="/" passHref>
          <Button data-testid="continue-shopping-button">
            Seguir comprando
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview
