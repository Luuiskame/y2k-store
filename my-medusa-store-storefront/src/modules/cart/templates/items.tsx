import { HttpTypes } from "@medusajs/types"

import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items
  const itemCount =
    items?.reduce((sum, i) => sum + (i.quantity ?? 0), 0) ?? 0

  return (
    <div>
      <div className="flex items-baseline justify-between pb-4">
        <h1
          className="font-heading text-2xl small:text-3xl"
          style={{ color: "var(--brand-ghost-white)" }}
        >
          Tu Carrito
        </h1>
        {itemCount > 0 && (
          <span
            className="text-sm font-body"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-y-3">
        {(items ?? [])
          .slice()
          .sort((a, b) =>
            (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
          )
          .map((item) => (
            <Item
              key={item.id}
              item={item}
              currencyCode={cart?.currency_code!}
            />
          ))}
      </div>
    </div>
  )
}

export default ItemsTemplate
