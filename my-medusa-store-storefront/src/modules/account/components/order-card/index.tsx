import { Button } from "@medusajs/ui"
import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])

  return (
    <div className="flex flex-col gap-y-3" data-testid="order-card">
      <div className="flex flex-col small:flex-row small:items-center small:justify-between gap-y-1">
        <div className="uppercase text-large-semi">
          #<span data-testid="order-display-id">{order.display_id}</span>
        </div>
        <div className="flex items-center divide-x divide-brand-amethyst text-small-regular text-brand-silver-ash">
          <span className="pr-2" data-testid="order-created-at">
            {new Date(order.created_at).toLocaleDateString("es-HN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="px-2" data-testid="order-amount">
            {convertToLocale({
              amount: order.total,
              currency_code: order.currency_code,
            })}
          </span>
          <span className="pl-2">
            {numberOfLines} {numberOfLines > 1 ? "artículos" : "artículo"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 small:grid-cols-4 gap-3">
        {order.items?.slice(0, 3).map((i) => {
          return (
            <div
              key={i.id}
              className="flex flex-col gap-y-1"
              data-testid="order-item"
            >
              <Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
              <div className="flex items-center text-xsmall-regular text-brand-ghost-white">
                <span
                  className="text-brand-ghost-white font-semibold truncate"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span className="ml-1 shrink-0">x</span>
                <span data-testid="item-quantity" className="shrink-0">
                  {i.quantity}
                </span>
              </div>
            </div>
          )
        })}
        {numberOfProducts > 4 && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-brand-abyss-purple border border-brand-amethyst rounded-rounded">
            <span className="text-small-regular text-brand-ghost-white">
              + {numberOfLines - 4}
            </span>
            <span className="text-xsmall-regular text-brand-silver-ash">más</span>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            Ver detalles
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
