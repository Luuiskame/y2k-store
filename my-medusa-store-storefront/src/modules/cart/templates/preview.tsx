"use client"

import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"

import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

const ItemsPreviewTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart.items
  const hasOverflow = items && items.length > 4

  return (
    <div
      className={clx({
        "pl-[1px] overflow-y-scroll overflow-x-hidden no-scrollbar max-h-[420px]":
          hasOverflow,
      })}
      data-testid="items-table"
    >
      <div className="flex flex-col">
        {(items ?? [])
          .slice()
          .sort((a, b) =>
            (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
          )
          .map((item) => (
            <Item
              key={item.id}
              item={item}
              type="preview"
              currencyCode={cart.currency_code}
            />
          ))}
      </div>
    </div>
  )
}

export default ItemsPreviewTemplate
