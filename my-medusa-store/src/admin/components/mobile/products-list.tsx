import { Plus } from "@medusajs/icons"
import { Badge, Button, Heading, Text, clx } from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"

import { useT } from "../../i18n/use-t"
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

/** Products that are not on sale say why; the words are in the dictionary. */
const STATUS_TONE: Record<string, "grey" | "orange" | "red"> = {
  draft: "grey",
  proposed: "orange",
  rejected: "red",
}

/** A size and how many are left: the answer to "¿tenés en M?". */
const SizePill = ({ variant }: { variant: CompactVariant }) => {
  const t = useT()
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
        {variant.title || t.catalog.oneSize}
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
  const words = useT().catalog.products
  const tone = STATUS_TONE[product.status]
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
              {tone && (
                <Badge size="2xsmall" color={tone} className="shrink-0">
                  {words.status[product.status]}
                </Badge>
              )}
            </div>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {[
                priceRange(product, currency),
                available === null
                  ? null
                  : available === 0
                  ? words.soldOut
                  : words.inStock(available),
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
  const t = useT()
  const words = t.catalog.products
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
        <Heading>{words.title}</Heading>
        <Button variant="secondary" asChild>
          <Link to="create">
            <Plus />
            {words.create}
          </Link>
        </Button>
      </div>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={t.catalog.searchProduct}
        label={words.searchLabel}
      />

      <div className="y2k-chips" role="group" aria-label={words.filterAria}>
        <Chip on={status === "all"} onClick={() => choose("all")}>
          {t.orders.list.all}
        </Chip>
        <Chip on={status === "published"} onClick={() => choose("published")}>
          {words.forSale}
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
          message={errorMessage(query.error, words.loadError)}
          onRetry={() => query.refetch()}
        />
      ) : products.length === 0 ? (
        q ? (
          <EmptyState title={t.orders.list.noResults}>
            {t.orders.list.nothingMatches(q)}
          </EmptyState>
        ) : (
          <EmptyState title={words.emptyTitle}>{words.emptyDetail}</EmptyState>
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
            noun={words.noun}
            hasMore={!!query.hasNextPage}
            loading={query.isFetchingNextPage}
            onMore={() => query.fetchNextPage()}
          />
        </>
      )}
    </div>
  )
}
