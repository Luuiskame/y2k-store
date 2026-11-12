import { ArrowPath, Plus } from "@medusajs/icons"
import { Badge, Button, Heading, IconButton, Text, clx } from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"

import { useT } from "../../i18n/use-t"
import { formatMoney } from "../../lib/analytics-format"
import {
  CompactOrder,
  OrderView,
  errorMessage,
  useCompactOrders,
} from "../../lib/compact"
import {
  STORE_NAME,
  formatAgo,
  fulfillmentLabel,
  paymentLabel,
  paymentMethodName,
  summarizeItems,
} from "../../lib/orders-format"
import { readStored, useDebounced, writeStored } from "../../lib/use-debounced"
import { Thumb } from "../common/thumb"
import { WhatsappLink } from "../common/whatsapp"
import {
  CardSkeleton,
  Chip,
  EmptyState,
  ErrorState,
  ListFooter,
  SearchField,
} from "./parts"

const VIEW_KEY = "y2k-orders-view"
const VIEWS: readonly OrderView[] = ["all", "unpaid", "unfulfilled"]

const OrderCard = ({ order }: { order: CompactOrder }) => {
  const words = useT().orders.card
  const canceled = order.status === "canceled"
  const payment = paymentLabel(order.payment_status)
  const fulfillment = fulfillmentLabel(order.fulfillment_status)
  const name = order.customer_name || order.email || words.noName
  const method = paymentMethodName(order.payment_provider)
  const number = order.display_id ? `#${order.display_id}` : words.order
  const firstName = order.customer_name.split(" ")[0] ?? ""

  return (
    <li
      className={clx(
        "y2k-tap bg-ui-bg-base shadow-elevation-card-rest relative rounded-xl",
        canceled && "opacity-60"
      )}
    >
      {/* The whole card opens the order; WhatsApp sits above this link. */}
      <Link
        to={`/orders/${order.id}`}
        aria-label={words.aria(number, name)}
        className="focus-visible:shadow-borders-interactive-with-focus absolute inset-0 rounded-xl outline-none"
      />
      <div className="pointer-events-none relative flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Text size="small" leading="compact" weight="plus" className="text-ui-fg-subtle">
                {number}
              </Text>
              <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
                {formatAgo(order.created_at)}
              </Text>
            </div>
            <Text size="base" leading="compact" weight="plus" className="truncate">
              {name}
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle truncate">
              {[order.city, method].filter(Boolean).join(" · ") || words.noAddress}
            </Text>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="y2k-num text-ui-fg-base text-[19px] font-medium leading-6">
              {formatMoney(order.total, order.currency_code)}
            </span>
            {order.collect_total !== null && order.collect_total !== order.total && (
              <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
                {words.collect(formatMoney(order.collect_total, order.currency_code))}
              </Text>
            )}
          </div>
        </div>

        {order.items.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 -space-x-3">
              {order.items.slice(0, 3).map((item, index) => (
                <Thumb key={index} src={item.thumbnail} size="sm" />
              ))}
            </div>
            <Text size="small" leading="compact" className="text-ui-fg-subtle line-clamp-2">
              {summarizeItems(order.items, order.item_count)}
            </Text>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {canceled ? (
              <Badge size="2xsmall" color="red">
                {words.canceled}
              </Badge>
            ) : (
              <>
                <Badge size="2xsmall" color={payment.tone}>
                  {payment.label}
                </Badge>
                <Badge size="2xsmall" color={fulfillment.tone}>
                  {fulfillment.label}
                </Badge>
                {order.bac_status === "proof_uploaded" && (
                  <Badge size="2xsmall" color="purple">
                    {words.proofToReview}
                  </Badge>
                )}
              </>
            )}
          </div>
          <WhatsappLink
            phone={order.phone}
            countryCode={order.country_code}
            // Written to the customer: Spanish, whatever the panel is in
            // (the same greeting as the first template of lib/whatsapp.ts).
            message={`Hola${firstName ? ` ${firstName}` : ""}, te escribimos de ${STORE_NAME} por tu pedido${
              order.display_id ? ` #${order.display_id}` : ""
            }.`}
            iconOnly
            className="pointer-events-auto"
          />
        </div>
      </div>
    </li>
  )
}

/**
 * The orders page on a phone: cards instead of Medusa's table, newest first,
 * with the two questions the owner opens it for one tap away (what is still
 * to collect, what is still to ship) and WhatsApp on every order.
 *
 * Rendered by the `order.list.before` widget; the class on its root is what
 * hides Medusa's own table below it (see theme.css).
 */
export const MobileOrders = () => {
  const t = useT()
  const words = t.orders
  const [view, setView] = useState<OrderView>(() => readStored(VIEW_KEY, VIEWS, "all"))
  const [search, setSearch] = useState("")
  const q = useDebounced(search.trim(), 350)

  const query = useCompactOrders({ view, q })
  const pages = query.data?.pages ?? []
  const orders = pages.flatMap((page) => page.orders)
  const total = pages[0]?.count ?? 0
  const pending = pages[0]?.pending ?? null

  const choose = (next: OrderView) => {
    setView(next)
    writeStored(VIEW_KEY, next)
  }

  return (
    <div className="y2k-m-takeover flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <Heading>{words.title}</Heading>
        <div className="flex items-center gap-2">
          <IconButton
            variant="transparent"
            aria-label={words.list.refresh}
            onClick={() => query.refetch()}
          >
            <ArrowPath className={query.isFetching ? "animate-spin" : undefined} />
          </IconButton>
          <Button asChild>
            <Link to="/nuevo-pedido">
              <Plus />
              {words.newOrder}
            </Link>
          </Button>
        </div>
      </div>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={words.searchPlaceholder}
        label={words.searchLabel}
      />

      <div className="y2k-chips" role="group" aria-label={words.filterAria}>
        <Chip on={view === "all"} onClick={() => choose("all")}>
          {words.list.all}
        </Chip>
        <Chip
          on={view === "unpaid"}
          onClick={() => choose("unpaid")}
          count={pending?.awaiting_payment}
        >
          {words.unpaid}
        </Chip>
        <Chip
          on={view === "unfulfilled"}
          onClick={() => choose("unfulfilled")}
          count={pending?.to_fulfill}
        >
          {words.unfulfilled}
        </Chip>
      </div>

      {view === "unpaid" && pending && pending.awaiting_payment > 0 && !q && (
        <Text size="small" leading="compact" className="text-ui-fg-subtle px-1">
          {words.toCollectIn(
            formatMoney(pending.awaiting_amount, orders[0]?.currency_code ?? "hnl"),
            pending.awaiting_payment
          )}
        </Text>
      )}

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      ) : query.isError && orders.length === 0 ? (
        <ErrorState
          message={errorMessage(query.error, words.loadError)}
          onRetry={() => query.refetch()}
        />
      ) : orders.length === 0 ? (
        q ? (
          <EmptyState title={words.list.noResults}>{words.list.nothingMatches(q)}</EmptyState>
        ) : (
          <EmptyState title={words.empty[view].title}>{words.empty[view].detail}</EmptyState>
        )
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </ul>
          <ListFooter
            shown={orders.length}
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
