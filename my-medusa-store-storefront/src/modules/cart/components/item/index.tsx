"use client"

import { clx, Text } from "@medusajs/ui"
import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import InlineAlert from "@modules/cart/components/inline-alert"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Trash from "@modules/common/icons/trash"
import Thumbnail from "@modules/products/components/thumbnail"
import QuantityStepper from "@modules/cart/components/quantity-stepper"
import { translateCartError } from "@modules/cart/util/translate-cart-error"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<{ message: string; signal: number } | null>(null)

  const showError = (raw: string) => {
    const friendly = translateCartError(raw)
    setError({
      message: friendly?.message ?? raw,
      signal: Date.now(),
    })
  }

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => showError(err.message))
      .finally(() => setUpdating(false))
  }

  const remove = async () => {
    setError(null)
    setRemoving(true)
    await deleteLineItem(item.id).catch((err) => {
      showError(err.message)
      setRemoving(false)
    })
  }

  const maxQuantity = 10
  const total = item.total ?? 0
  const originalTotal = item.original_total ?? 0
  const quantity = item.quantity || 1
  const hasReducedPrice = total < originalTotal
  const unitPrice = total / quantity
  const lineTotal = convertToLocale({
    amount: total,
    currency_code: currencyCode,
  })
  const originalLineTotal = convertToLocale({
    amount: originalTotal,
    currency_code: currencyCode,
  })
  const unitPriceLabel = convertToLocale({
    amount: unitPrice,
    currency_code: currencyCode,
  })

  if (type === "preview") {
    return (
      <div
        className="flex gap-x-3 py-3"
        data-testid="product-row"
        style={{ borderBottom: "1px solid var(--brand-amethyst)" }}
      >
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="w-16 shrink-0"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
          />
        </LocalizedClientLink>
        <div className="flex-1 min-w-0">
          <Text
            className="font-heading text-sm leading-snug line-clamp-2"
            style={{ color: "var(--brand-ghost-white)" }}
            data-testid="product-title"
          >
            {item.product_title}
          </Text>
          <Text
            className="text-xs mt-0.5"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            {item.variant?.title}
          </Text>
          <div className="flex items-center justify-between mt-1.5">
            <span
              className="text-xs"
              style={{ color: "var(--brand-silver-ash)" }}
            >
              {item.quantity} × {unitPriceLabel}
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--brand-ghost-white)" }}
            >
              {lineTotal}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative flex gap-x-4 small:gap-x-5 p-3 small:p-4 rounded-large transition-colors"
      data-testid="product-row"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <LocalizedClientLink
        href={`/products/${item.product_handle}`}
        className="w-24 small:w-28 shrink-0"
      >
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="square"
        />
      </LocalizedClientLink>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-x-2">
          <div className="min-w-0 flex-1">
            <LocalizedClientLink href={`/products/${item.product_handle}`}>
              <h3
                className="font-heading text-sm small:text-base leading-snug line-clamp-2"
                style={{ color: "var(--brand-ghost-white)" }}
                data-testid="product-title"
              >
                {item.product_title}
              </h3>
            </LocalizedClientLink>
            {item.variant?.title && (
              <div
                className="text-xs mt-1 truncate"
                style={{ color: "var(--brand-silver-ash)" }}
                data-testid="product-variant"
              >
                Talla / Variante: {item.variant.title}
              </div>
            )}
            <div
              className="text-xs mt-1.5 font-body"
              style={{ color: "var(--brand-silver-ash)" }}
              data-testid="product-unit-price"
            >
              {unitPriceLabel} <span className="opacity-60">c/u</span>
            </div>
          </div>

          <button
            type="button"
            onClick={remove}
            disabled={removing}
            aria-label="Eliminar producto"
            className="shrink-0 p-1.5 rounded-full transition-colors hover:opacity-100"
            style={{
              color: "var(--brand-silver-ash)",
              opacity: removing ? 0.5 : 0.8,
            }}
            data-testid="product-delete-button"
          >
            <Trash size={16} />
          </button>
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between gap-x-3 flex-wrap">
          <QuantityStepper
            value={item.quantity}
            onChange={changeQuantity}
            max={maxQuantity}
            loading={updating}
          />

          <div className="text-right">
            {hasReducedPrice && (
              <div
                className="text-xs line-through"
                style={{ color: "var(--brand-silver-ash)" }}
                data-testid="product-original-price"
              >
                {originalLineTotal}
              </div>
            )}
            <div
              className={clx("text-base font-semibold font-body")}
              style={{
                color: hasReducedPrice
                  ? "var(--brand-divine-lilac)"
                  : "var(--brand-ghost-white)",
              }}
              data-testid="product-price"
            >
              {lineTotal}
            </div>
          </div>
        </div>

        {error && (
          <InlineAlert
            message={error.message}
            signal={error.signal}
            data-testid="product-error-message"
          />
        )}
      </div>
    </div>
  )
}

export default Item
