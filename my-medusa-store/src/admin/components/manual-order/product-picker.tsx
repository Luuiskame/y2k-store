import { Minus, Plus, Trash } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

import { formatMoney } from "../../lib/analytics-format"
import {
  CompactProduct,
  CompactVariant,
  errorMessage,
  useCompactProducts,
} from "../../lib/compact"
import {
  Line,
  addVariant,
  isSellable,
  maxQuantity,
  setQuantity,
} from "../../lib/manual-order-form"
import { LOW_STOCK, priceRange } from "../../lib/products-format"
import { useDebounced } from "../../lib/use-debounced"
import { Thumb } from "../common/thumb"
import { SearchField } from "../mobile/parts"

const stockNote = (variant: CompactVariant): string => {
  if (variant.price === null) {
    return "sin precio"
  }
  if (variant.available === null) {
    return ""
  }
  if (variant.available <= 0) {
    return variant.allow_backorder ? "bajo pedido" : "agotado"
  }
  return String(variant.available)
}

const ProductRow = ({
  product,
  currency,
  lines,
  onAdd,
}: {
  product: CompactProduct
  currency: string
  lines: Line[]
  onAdd: (variant: CompactVariant) => void
}) => (
  <li className="flex flex-col gap-3 px-6 py-4">
    <div className="flex items-center gap-3">
      <Thumb src={product.thumbnail} alt="" size="md" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text size="small" leading="compact" weight="plus" className="truncate">
          {product.title}
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {priceRange(product, currency)}
        </Text>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {product.variants.map((variant) => {
        const sellable = isSellable(variant)
        const inOrder = lines.find((line) => line.variant_id === variant.id)
        const note = stockNote(variant)
        return (
          <button
            key={variant.id}
            type="button"
            disabled={!sellable}
            onClick={() => onAdd(variant)}
            aria-label={`Agregar ${product.title} ${variant.title}`.trim()}
            className={clx(
              "shadow-borders-base bg-ui-bg-field flex min-h-10 items-center gap-2 rounded-lg px-3 text-left outline-none transition-colors",
              "focus-visible:shadow-borders-interactive-with-focus",
              sellable
                ? "hover:bg-ui-bg-field-hover text-ui-fg-base"
                : "text-ui-fg-disabled cursor-not-allowed",
              inOrder && "shadow-borders-interactive-with-active"
            )}
          >
            <span className="txt-compact-small-plus">{variant.title || "Único"}</span>
            {note && (
              <span
                className={clx(
                  "txt-compact-xsmall tabular-nums",
                  !sellable
                    ? "text-ui-fg-disabled"
                    : variant.available !== null && variant.available <= LOW_STOCK
                    ? "text-ui-tag-orange-text"
                    : "text-ui-fg-muted"
                )}
              >
                {note}
              </span>
            )}
            {inOrder && (
              <span className="bg-ui-bg-interactive text-ui-fg-on-color txt-compact-xsmall-plus rounded-full px-1.5 tabular-nums">
                {inOrder.quantity}
              </span>
            )}
          </button>
        )
      })}
    </div>
  </li>
)

const LineRow = ({
  line,
  currency,
  onQuantity,
}: {
  line: Line
  currency: string
  onQuantity: (quantity: number) => void
}) => {
  const max = maxQuantity(line)
  const over = line.quantity > max

  return (
    <li className="flex items-center gap-3 px-6 py-3">
      <Thumb src={line.thumbnail} alt="" size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="small" leading="compact" weight="plus" className="truncate">
          {line.title}
        </Text>
        <Text
          size="xsmall"
          leading="compact"
          className={over ? "text-ui-fg-error" : "text-ui-fg-subtle"}
        >
          {[
            line.variant_title,
            line.price !== null ? formatMoney(line.price, currency) : null,
            over ? `solo hay ${max}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onQuantity(line.quantity - 1)}
          aria-label={line.quantity === 1 ? `Quitar ${line.title}` : `Uno menos de ${line.title}`}
          className="shadow-borders-base bg-ui-bg-field hover:bg-ui-bg-field-hover text-ui-fg-subtle focus-visible:shadow-borders-interactive-with-focus flex h-9 w-9 items-center justify-center rounded-lg outline-none"
        >
          {line.quantity === 1 ? <Trash /> : <Minus />}
        </button>
        <span
          className="txt-compact-medium-plus w-7 text-center tabular-nums"
          aria-label={`Cantidad: ${line.quantity}`}
        >
          {line.quantity}
        </span>
        <button
          type="button"
          onClick={() => onQuantity(line.quantity + 1)}
          disabled={line.quantity >= max}
          aria-label={`Uno más de ${line.title}`}
          className="shadow-borders-base bg-ui-bg-field hover:bg-ui-bg-field-hover text-ui-fg-subtle disabled:text-ui-fg-disabled focus-visible:shadow-borders-interactive-with-focus flex h-9 w-9 items-center justify-center rounded-lg outline-none disabled:cursor-not-allowed"
        >
          <Plus />
        </button>
      </div>
    </li>
  )
}

/**
 * What goes in the order: pick products by size, with the storefront's own
 * prices and what is left in stock, and adjust quantities on the chosen
 * lines. A size is a button; tapping it again adds one more.
 */
export const ProductPicker = ({
  lines,
  currency,
  onChange,
  onCurrency,
}: {
  lines: Line[]
  currency: string
  onChange: (lines: Line[]) => void
  /** The catalog's currency, once known. */
  onCurrency: (currency: string) => void
}) => {
  const [search, setSearch] = useState("")
  const q = useDebounced(search.trim(), 300)

  const query = useCompactProducts({ q, status: "published", pageSize: 6 })
  const pages = query.data?.pages ?? []
  const products = pages.flatMap((page) => page.products)
  const total = pages[0]?.count ?? 0
  const catalogCurrency = pages[0]?.currency_code

  useEffect(() => {
    if (catalogCurrency) {
      onCurrency(catalogCurrency)
    }
  }, [catalogCurrency, onCurrency])

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-1 px-6 py-4">
        <Heading level="h2">Productos</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Tocá una talla para agregarla. El número al lado es lo que queda.
        </Text>
      </div>

      {lines.length > 0 && (
        <ul className="divide-y" aria-label="Productos del pedido">
          {lines.map((line) => (
            <LineRow
              key={line.variant_id}
              line={line}
              currency={currency}
              onQuantity={(quantity) =>
                onChange(setQuantity(lines, line.variant_id, quantity))
              }
            />
          ))}
        </ul>
      )}

      <div className="px-6 py-4">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto"
          label="Buscar producto"
        />
      </div>

      {query.isLoading ? (
        <div className="px-6 py-6">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Cargando productos…
          </Text>
        </div>
      ) : query.isError && products.length === 0 ? (
        <div className="flex flex-col items-start gap-2 px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-error">
            {errorMessage(query.error, "No se pudieron cargar los productos.")}
          </Text>
          <Button size="small" variant="secondary" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="px-6 py-6">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {q
              ? `Ningún producto publicado coincide con «${q}».`
              : "No hay productos publicados."}
          </Text>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                currency={currency}
                lines={lines}
                onAdd={(variant) => onChange(addVariant(lines, product, variant))}
              />
            ))}
          </ul>
          {query.hasNextPage && (
            <div className="px-6 py-3">
              <Button
                size="small"
                variant="transparent"
                onClick={() => query.fetchNextPage()}
                isLoading={query.isFetchingNextPage}
              >
                Ver más productos ({total - products.length} más)
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  )
}
