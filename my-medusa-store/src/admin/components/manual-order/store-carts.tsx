import { DocumentText, XMarkMini } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"

import { useT } from "../../i18n/use-t"
import { formatMoney } from "../../lib/analytics-format"
import { errorMessage } from "../../lib/compact"
import { extractCartId } from "../../lib/manual-order-form"
import {
  StoreCartCard,
  StoreCartPrefill,
  useStoreCarts,
} from "../../lib/manual-orders"
import { formatAgo, summarizeItems } from "../../lib/orders-format"
import { useDebounced } from "../../lib/use-debounced"
import { toWhatsappNumber } from "../../lib/whatsapp"
import { SearchField } from "../mobile/parts"

const COLLAPSED = 3

const CartRow = ({
  cart,
  loading,
  onPick,
}: {
  cart: StoreCartCard
  loading: boolean
  onPick: () => void
}) => {
  const words = useT().manualOrder.carts
  const number = toWhatsappNumber(cart.phone, "hn")

  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={loading}
        className="hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-hover flex w-full flex-col gap-1 px-6 py-3 text-left outline-none transition-colors disabled:opacity-60"
      >
        <div className="flex items-baseline justify-between gap-3">
          <Text size="small" leading="compact" weight="plus" className="truncate">
            {cart.customer_name || words.noName}
          </Text>
          <Text size="small" leading="compact" weight="plus" className="shrink-0 tabular-nums">
            {formatMoney(cart.total, cart.currency_code)}
          </Text>
        </div>
        <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
          {[number?.display ?? cart.phone, cart.city, formatAgo(cart.updated_at)]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text size="xsmall" leading="compact" className="text-ui-fg-subtle line-clamp-1">
          {summarizeItems(cart.items, cart.item_count)}
        </Text>
        {cart.placed && (
          <div>
            <Badge size="2xsmall" color="orange">
              {words.alreadyOrder(cart.placed.display_id ? ` #${cart.placed.display_id}` : "")}
            </Badge>
          </div>
        )}
      </button>
    </li>
  )
}

/**
 * Starting an order from a customer's storefront cart. A customer who picks
 * "pago contra entrega" in the checkout is sent to WhatsApp with their order
 * typed out, and the cart they built stays in the store with everything in
 * it: products, address, how they want it shipped. This lists those carts,
 * and finds one from the pasted message (it ends with the cart's id).
 */
export const StoreCartsSection = ({
  loaded,
  loadingId,
  onPick,
  onClear,
}: {
  /** The cart the form was filled from, if any. */
  loaded: StoreCartPrefill | null
  /** Id of the cart being fetched right now. */
  loadingId: string | null
  onPick: (cartId: string) => void
  onClear: () => void
}) => {
  const words = useT().manualOrder.carts
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState(false)
  const q = useDebounced(search.trim(), 350)

  const query = useStoreCarts(q)
  const carts = query.data?.carts ?? []
  const shown = expanded ? carts : carts.slice(0, COLLAPSED)

  const onSearch = (value: string) => {
    setSearch(value)
    // A pasted message carries the cart's id: no need to pick it by hand.
    const pasted = extractCartId(value)
    if (pasted) {
      onPick(pasted)
      setSearch("")
    }
  }

  const onPaste = async () => {
    let text = ""
    try {
      text = await navigator.clipboard.readText()
    } catch {
      toast.info(words.pasteBelow, { description: words.pasteBlocked })
      return
    }
    const id = extractCartId(text)
    if (id) {
      onPick(id)
    } else {
      toast.warning(words.noCartInText, { description: words.copyWholeMessage })
    }
  }

  if (loaded) {
    const address = loaded.shipping_address
    return (
      <Container className="flex flex-col gap-3 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Text size="small" leading="compact" weight="plus">
              {words.fromCartOf(address?.full_name || words.aCustomer)}
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {words.fromCartHint(formatMoney(loaded.total, loaded.currency_code))}
            </Text>
          </div>
          <Button size="small" variant="secondary" className="shrink-0" onClick={onClear}>
            <XMarkMini />
            {words.remove}
          </Button>
        </div>
        {(loaded.placed || loaded.completed) && (
          <Text size="small" leading="compact" className="text-ui-tag-orange-text">
            {loaded.placed ? (
              <>
                {words.placedBefore}{" "}
                <Link to={`/orders/${loaded.placed.order_id}`} className="underline">
                  {words.theOrder(
                    loaded.placed.display_id ? ` #${loaded.placed.display_id}` : ""
                  )}
                </Link>
                {words.placedAfter}
              </>
            ) : (
              words.completedInStore
            )}
          </Text>
        )}
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{words.heading}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.headingHint}
          </Text>
        </div>
        <Button variant="secondary" className="shrink-0" onClick={onPaste}>
          <DocumentText />
          {words.paste}
        </Button>
      </div>

      <div className="px-6 py-4">
        <SearchField
          value={search}
          onChange={onSearch}
          placeholder={words.searchPlaceholder}
          label={words.searchLabel}
        />
      </div>

      {query.isLoading ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.searching}
          </Text>
        </div>
      ) : query.isError ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-error">
            {errorMessage(query.error, words.loadError)}
          </Text>
        </div>
      ) : carts.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {q ? words.noneMatch(q) : words.none}
          </Text>
        </div>
      ) : (
        <>
          <ul className="divide-y" aria-label={words.listAria}>
            {shown.map((cart) => (
              <CartRow
                key={cart.id}
                cart={cart}
                loading={loadingId === cart.id}
                onPick={() => onPick(cart.id)}
              />
            ))}
          </ul>
          {carts.length > COLLAPSED && (
            <div className="px-6 py-3">
              <Button
                size="small"
                variant="transparent"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? words.showLess : words.showAll(carts.length)}
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  )
}
