import { Minus, Plus } from "@medusajs/icons"
import { Button, Heading, Text, clx, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { useT } from "../../i18n/use-t"
import { sdk } from "../../lib/client"
import {
  COMPACT_PRODUCTS_KEY,
  CompactProduct,
  CompactVariant,
  errorMessage,
  useCompactProducts,
} from "../../lib/compact"
import { LOW_STOCK, stockLevel } from "../../lib/products-format"
import { readStored, useDebounced, writeStored } from "../../lib/use-debounced"
import { Thumb } from "../common/thumb"
import {
  CardSkeleton,
  Chip,
  EmptyState,
  ErrorState,
  ListFooter,
  SearchField,
} from "./parts"

type View = "all" | "low" | "out"

const VIEW_KEY = "y2k-inventory-view"
const VIEWS: readonly View[] = ["all", "low", "out"]

const MAX_STOCK = 99999

const matchesView = (variant: CompactVariant, view: View): boolean => {
  return view === "all" || stockLevel(variant.available) === view
}

type StockChange = {
  inventory_item_id: string
  location_id: string
  stocked_quantity: number
}

const VariantRow = ({
  variant,
  stocked,
  onStocked,
  disabled,
}: {
  variant: CompactVariant
  /** Units in the warehouse as edited (not yet saved). */
  stocked: number | null
  onStocked: (value: number) => void
  disabled: boolean
}) => {
  const t = useT()
  const words = t.catalog.inventory
  const stock = variant.stock
  const reserved = stock?.reserved ?? 0
  const available =
    stock && stocked !== null ? Math.max(0, stocked - reserved) : variant.available
  const level = stockLevel(available)
  const out = level === "out"
  const low = level === "low"
  const changed = !!stock && stocked !== null && stocked !== stock.stocked
  const name = variant.title || t.catalog.oneSize

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text size="small" leading="compact" weight="plus" className="truncate">
          {name}
        </Text>
        <Text
          size="xsmall"
          leading="compact"
          className={clx(
            out ? "text-ui-fg-error" : low ? "text-ui-tag-orange-text" : "text-ui-fg-subtle"
          )}
        >
          {available === null
            ? words.untracked
            : [
                out ? words.out : words.available(available),
                reserved > 0 ? words.inOrders(reserved) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </Text>
      </div>

      {stock && stocked !== null ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onStocked(Math.max(0, stocked - 1))}
            disabled={disabled || stocked <= 0}
            aria-label={words.oneLess(name)}
            className="shadow-borders-base bg-ui-bg-field hover:bg-ui-bg-field-hover text-ui-fg-subtle disabled:text-ui-fg-disabled focus-visible:shadow-borders-interactive-with-focus flex h-10 w-10 items-center justify-center rounded-lg outline-none"
          >
            <Minus />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_STOCK}
            value={stocked}
            disabled={disabled}
            onChange={(event) => {
              const value = Math.round(Number(event.target.value))
              onStocked(
                Number.isFinite(value) ? Math.min(MAX_STOCK, Math.max(0, value)) : 0
              )
            }}
            onFocus={(event) => event.target.select()}
            aria-label={words.inWarehouse(name)}
            className={clx(
              "bg-ui-bg-field shadow-borders-base focus-visible:shadow-borders-interactive-with-active h-10 w-16 rounded-lg text-center tabular-nums outline-none",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              changed ? "text-[color:var(--y2k-accent)] font-semibold" : "text-ui-fg-base"
            )}
          />
          <button
            type="button"
            onClick={() => onStocked(Math.min(MAX_STOCK, stocked + 1))}
            disabled={disabled}
            aria-label={words.oneMore(name)}
            className="shadow-borders-base bg-ui-bg-field hover:bg-ui-bg-field-hover text-ui-fg-subtle disabled:text-ui-fg-disabled focus-visible:shadow-borders-interactive-with-focus flex h-10 w-10 items-center justify-center rounded-lg outline-none"
          >
            <Plus />
          </button>
        </div>
      ) : (
        variant.available !== null && (
          <Text size="xsmall" leading="compact" className="text-ui-fg-muted shrink-0">
            {words.severalWarehouses}
          </Text>
        )
      )}
    </li>
  )
}

const ProductStock = ({
  product,
  view,
}: {
  product: CompactProduct
  view: View
}) => {
  const queryClient = useQueryClient()
  const words = useT().catalog.inventory

  // Units in the warehouse per variant, as the owner is editing them.
  const [edits, setEdits] = useState<Record<string, number>>({})

  // Fresh numbers from the server replace an edit that now says the same.
  useEffect(() => {
    setEdits((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([variantId, value]) => {
          const variant = product.variants.find((v) => v.id === variantId)
          return !!variant?.stock && variant.stock.stocked !== value
        })
      )
      return Object.keys(next).length === Object.keys(current).length ? current : next
    })
  }, [product])

  const changes: StockChange[] = product.variants.flatMap((variant) =>
    variant.stock && variant.id in edits && edits[variant.id] !== variant.stock.stocked
      ? [
          {
            inventory_item_id: variant.stock.inventory_item_id,
            location_id: variant.stock.location_id,
            stocked_quantity: edits[variant.id],
          },
        ]
      : []
  )

  const save = useMutation({
    mutationFn: async (list: StockChange[]) => {
      // One at a time: each is its own request, and a failure should say
      // which sizes did get saved.
      for (const change of list) {
        await sdk.admin.inventoryItem.updateLevel(
          change.inventory_item_id,
          change.location_id,
          { stocked_quantity: change.stocked_quantity }
        )
      }
    },
    onSuccess: () => {
      toast.success(words.saved(product.title))
    },
    onError: (error) => {
      toast.error(errorMessage(error, words.saveFailed))
    },
    onSettled: () => {
      // Whatever got saved is real: reload ours and Medusa's own lists.
      for (const queryKey of [COMPACT_PRODUCTS_KEY, ["inventory_items"], ["products"]]) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })

  const variants = product.variants.filter((variant) => matchesView(variant, view))
  if (variants.length === 0) {
    return null
  }

  return (
    <li className="bg-ui-bg-base shadow-elevation-card-rest flex flex-col rounded-xl">
      <Link
        to={`/products/${product.id}`}
        className="focus-visible:shadow-borders-interactive-with-focus flex items-center gap-3 rounded-t-xl px-4 pt-4 outline-none"
      >
        <Thumb src={product.thumbnail} alt="" size="sm" />
        <Text size="base" leading="compact" weight="plus" className="line-clamp-2">
          {product.title}
        </Text>
      </Link>
      <ul className="divide-y px-4 pb-1 pt-1">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            stocked={
              variant.stock ? edits[variant.id] ?? variant.stock.stocked : null
            }
            onStocked={(value) =>
              setEdits((current) => ({ ...current, [variant.id]: value }))
            }
            disabled={save.isPending}
          />
        ))}
      </ul>
      {changes.length > 0 && (
        <div className="border-ui-border-base flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            size="small"
            variant="secondary"
            onClick={() => setEdits({})}
            disabled={save.isPending}
          >
            {words.undo}
          </Button>
          <Button
            size="small"
            onClick={() => save.mutate(changes)}
            isLoading={save.isPending}
            disabled={save.isPending}
          >
            {words.save(changes.length)}
          </Button>
        </div>
      )}
    </li>
  )
}

/**
 * The inventory page on a phone: stock by product and size, with a minus and
 * a plus on each. Medusa's own list is one row per inventory item, named
 * only by its size ("M"), which says nothing without the product next to it.
 *
 * The number edited is what is in the warehouse; what can be sold is that
 * minus what open orders have reserved. Changes are saved per product.
 *
 * Rendered by the `inventory_item.list.before` widget; the class on its root
 * hides Medusa's own table below it (see theme.css).
 */
export const MobileInventory = () => {
  const t = useT()
  const words = t.catalog.inventory
  const [view, setView] = useState<View>(() => readStored(VIEW_KEY, VIEWS, "all"))
  const [search, setSearch] = useState("")
  const q = useDebounced(search.trim(), 350)

  const query = useCompactProducts({ q, status: "all", pageSize: 20 })
  const pages = query.data?.pages ?? []
  const products = pages.flatMap((page) => page.products)
  const total = pages[0]?.count ?? 0

  const count = (which: View) =>
    products.reduce(
      (sum, product) =>
        sum + product.variants.filter((variant) => matchesView(variant, which)).length,
      0
    )
  const visible = products.filter((product) =>
    product.variants.some((variant) => matchesView(variant, view))
  )

  const choose = (next: View) => {
    setView(next)
    writeStored(VIEW_KEY, next)
  }

  return (
    <div className="y2k-m-takeover flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <Heading>{words.title}</Heading>
      </div>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={t.catalog.searchProduct}
        label={words.searchLabel}
      />

      <div className="y2k-chips" role="group" aria-label={words.filterAria}>
        <Chip on={view === "all"} onClick={() => choose("all")}>
          {words.all}
        </Chip>
        <Chip on={view === "low"} onClick={() => choose("low")} count={count("low")}>
          {words.low}
        </Chip>
        <Chip on={view === "out"} onClick={() => choose("out")} count={count("out")}>
          {words.out}
        </Chip>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} lines={5} />
          ))}
        </div>
      ) : query.isError && products.length === 0 ? (
        <ErrorState
          message={errorMessage(query.error, words.loadError)}
          onRetry={() => query.refetch()}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={
            q
              ? t.orders.list.noResults
              : view === "low"
              ? words.emptyLow
              : view === "out"
              ? words.emptyOut
              : words.emptyAll
          }
        >
          {q
            ? t.orders.list.nothingMatches(q)
            : view === "all"
            ? undefined
            : query.hasNextPage
            ? words.amongLoaded
            : view === "low"
            ? words.noneAtOrUnder(LOW_STOCK)
            : words.noneAtZero}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((product) => (
            <ProductStock key={product.id} product={product} view={view} />
          ))}
        </ul>
      )}

      {products.length > 0 && (
        <ListFooter
          shown={products.length}
          total={total}
          noun={words.noun}
          hasMore={!!query.hasNextPage}
          loading={query.isFetchingNextPage}
          onMore={() => query.fetchNextPage()}
        />
      )}
    </div>
  )
}
