import { Plus } from "@medusajs/icons"
import { Badge, Button, Heading, Text, clx } from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"

import {
  CompactProduct,
  CompactVariant,
  errorMessage,
  useCompactProducts,
} from "../../lib/compact"
import { priceRange, stockLevel, totalAvailable } from "../../lib/products-format"
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

type Status = "all" | "published"

const STATUS_KEY = "y2k-products-status"
const STATUSES: readonly Status[] = ["all", "published"]

const STATUS_LABEL: Record<string, { label: string; tone: "grey" | "orange" | "red" }> = {
  draft: { label: "Borrador", tone: "grey" },
  proposed: { label: "Propuesto", tone: "orange" },
  rejected: { label: "Rechazado", tone: "red" },
}

/** A size and how many are left: the answer to "¿tenés en M?". */
const SizePill = ({ variant }: { variant: CompactVariant }) => {
  const level = stockLevel(variant.available)
  const out = level === "out"
  const low = level === "low"

  return (
    <span
      className={clx(
        "shadow-borders-base inline-flex items-center gap-1.5 rounded-md px-2 py-1",
        out ? "bg-ui-bg-disabled" : "bg-ui-bg-field"
      )}
    >
      <span
        className={clx(
          "txt-compact-xsmall-plus",
          out ? "text-ui-fg-disabled line-through" : "text-ui-fg-base"
        )}
      >
        {variant.title || "Único"}
      </span>
      {variant.available !== null && (
        <span
          className={clx(
            "txt-compact-xsmall tabular-nums",
            out
              ? "text-ui-fg-disabled"
              : low
              ? "text-ui-tag-orange-text"
              : "text-ui-fg-muted"
          )}
        >
          {variant.available}
        </span>
      )}
    </span>
  )
}

const ProductCard = ({
  product,
  currency,
}: {
  product: CompactProduct
  currency: string
}) => {
  const status = STATUS_LABEL[product.status]
  const available = totalAvailable(product)

  return (
    <li className="y2k-tap bg-ui-bg-base shadow-elevation-card-rest relative rounded-xl">
      <Link
        to={`/products/${product.id}`}
        aria-label={product.title}
        className="focus-visible:shadow-borders-interactive-with-focus absolute inset-0 rounded-xl outline-none"
      />
      <div className="pointer-events-none relative flex gap-3 p-4">
        <Thumb src={product.thumbnail} alt="" size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-start justify-between gap-2">
              <Text size="base" leading="compact" weight="plus" className="line-clamp-2">
                {product.title}
              </Text>
              {status && (
                <Badge size="2xsmall" color={status.tone} className="shrink-0">
                  {status.label}
                </Badge>
              )}
            </div>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {[
                priceRange(product, currency),
                available === null
                  ? null
                  : available === 0
                  ? "agotado"
                  : `${available} en stock`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </div>
          {product.variants.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((variant) => (
                <SizePill key={variant.id} variant={variant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * The products page on a phone: a card per product with its photo, price and
 * every size with what is left of it, so "¿tenés en M?" is answered without
 * opening anything. Tapping a card opens Medusa's product page.
 *
 * Rendered by the `product.list.before` widget; the class on its root hides
 * Medusa's own table below it (see theme.css).
 */
export const MobileProducts = () => {
  const [status, setStatus] = useState<Status>(() =>
    readStored(STATUS_KEY, STATUSES, "all")
  )
  const [search, setSearch] = useState("")
  const q = useDebounced(search.trim(), 350)

  const query = useCompactProducts({ q, status, pageSize: 15 })
  const pages = query.data?.pages ?? []
  const products = pages.flatMap((page) => page.products)
  const total = pages[0]?.count ?? 0
  const currency = pages[0]?.currency_code ?? "hnl"

  const choose = (next: Status) => {
    setStatus(next)
    writeStored(STATUS_KEY, next)
  }

  return (
    <div className="y2k-m-takeover flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <Heading>Productos</Heading>
        <Button variant="secondary" asChild>
          <Link to="create">
            <Plus />
            Crear
          </Link>
        </Button>
      </div>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Buscar producto"
        label="Buscar productos"
      />

      <div className="y2k-chips" role="group" aria-label="Filtrar productos">
        <Chip on={status === "all"} onClick={() => choose("all")}>
          Todos
        </Chip>
        <Chip on={status === "published"} onClick={() => choose("published")}>
          A la venta
        </Chip>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : query.isError && products.length === 0 ? (
        <ErrorState
          message={errorMessage(query.error, "No se pudieron cargar los productos.")}
          onRetry={() => query.refetch()}
        />
      ) : products.length === 0 ? (
        q ? (
          <EmptyState title="Sin resultados">Nada coincide con «{q}».</EmptyState>
        ) : (
          <EmptyState title="Todavía no hay productos">
            Creá el primero con el botón de arriba.
          </EmptyState>
        )
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} currency={currency} />
            ))}
          </ul>
          <ListFooter
            shown={products.length}
            total={total}
            noun={["producto", "productos"]}
            hasMore={!!query.hasNextPage}
            loading={query.isFetchingNextPage}
            onMore={() => query.fetchNextPage()}
          />
        </>
      )}
    </div>
  )
}
