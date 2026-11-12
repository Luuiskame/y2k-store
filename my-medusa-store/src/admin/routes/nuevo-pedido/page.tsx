import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus } from "@medusajs/icons"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { CustomerFormSection } from "../../components/manual-order/customer-form"
import { ProductPicker } from "../../components/manual-order/product-picker"
import { ReviewModal } from "../../components/manual-order/review"
import { StoreCartsSection } from "../../components/manual-order/store-carts"
import { tr } from "../../i18n/tr"
import { useT } from "../../i18n/use-t"
import { formatMoney } from "../../lib/analytics-format"
import { cheer } from "../../lib/cheer"
import { errorMessage } from "../../lib/compact"
import {
  CustomerForm,
  Draft,
  EMPTY_CUSTOMER,
  Line,
  estimateSubtotal,
  fromStoreCart,
  isBlankForm,
  parseDraft,
  toCartInput,
  unitCount,
  validateOrderForm,
} from "../../lib/manual-order-form"
import {
  PlacedOrder,
  StoreCartPrefill,
  WorkingCart,
  fetchStoreCart,
  useCreateWorkingCart,
} from "../../lib/manual-orders"
import "../../theme/boot"

/** The form in progress, kept for this app session (see `Draft`). */
const DRAFT_KEY = "y2k-nuevo-pedido-draft"

const readDraft = (): Draft | null => {
  try {
    return parseDraft(sessionStorage.getItem(DRAFT_KEY))
  } catch {
    return null
  }
}

const writeDraft = (draft: Draft | null) => {
  try {
    if (draft) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } else {
      sessionStorage.removeItem(DRAFT_KEY)
    }
  } catch {
    // Storage blocked: leaving the page loses the form, as before.
  }
}

/**
 * Registers an order without buying it in the storefront: sales closed over
 * WhatsApp or Instagram, and above all pago contra entrega, which in the
 * storefront only sends the customer to WhatsApp and never becomes an order.
 *
 * One screen, top to bottom: optionally start from the cart the customer
 * left in the store, choose products, say who it is for, then review the
 * totals the server computed and create it. Built for a phone first: this is
 * what the "+" in the bottom bar opens.
 */
const NuevoPedidoPage = () => {
  const words = useT().manualOrder
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // What was being filled in before the page was left, if anything.
  const [draft] = useState(readDraft)
  const [lines, setLines] = useState<Line[]>(draft?.lines ?? [])
  const [customer, setCustomer] = useState<CustomerForm>(
    draft?.customer ?? EMPTY_CUSTOMER
  )
  const [source, setSource] = useState<StoreCartPrefill | null>(
    draft?.source ?? null
  )
  const [loadingCart, setLoadingCart] = useState<string | null>(null)
  const [currency, setCurrency] = useState(draft?.currency ?? "hnl")
  const blank = isBlankForm(lines, customer, source)

  useEffect(() => {
    writeDraft(blank ? null : { lines, customer, source, currency })
  }, [blank, lines, customer, source, currency])

  // Errors stay quiet until the owner asks to review.
  const [attempted, setAttempted] = useState(false)
  const [review, setReview] = useState<WorkingCart | null>(null)
  // The working cart of the last review; the next review replaces it.
  const workingCartId = useRef<string | null>(null)
  // Bumped when a new order starts, so the review's choices start over.
  const [reviewKey, setReviewKey] = useState(0)

  const createCart = useCreateWorkingCart()
  const errors = validateOrderForm(lines, customer)

  const pickCart = useCallback(async (cartId: string) => {
    setLoadingCart(cartId)
    try {
      const cart = await fetchStoreCart(cartId)
      const filled = fromStoreCart(cart)
      setLines(filled.lines)
      setCustomer(filled.customer)
      setSource(cart)
      setCurrency(cart.currency_code)
      setAttempted(false)
      // Read when it happens, not when this callback was made: the words
      // are the ones of the language in use at that moment.
      toast.success(tr().manualOrder.cartLoaded, {
        description: tr().manualOrder.cartLoadedHint,
      })
    } catch (error) {
      toast.error(errorMessage(error, tr().manualOrder.cartNotFound))
    } finally {
      setLoadingCart(null)
    }
  }, [])

  // /nuevo-pedido?cart=cart_… opens with that cart loaded.
  const linkedCart = searchParams.get("cart")
  useEffect(() => {
    if (linkedCart) {
      pickCart(linkedCart)
    }
  }, [linkedCart, pickCart])

  const onReview = () => {
    setAttempted(true)
    if (errors.length > 0) {
      toast.error(errors[0].message)
      return
    }
    createCart.mutate(
      toCartInput(lines, customer, {
        source,
        replaceCartId: workingCartId.current,
      }),
      {
        onSuccess: (cart) => {
          workingCartId.current = cart.id
          setReview(cart)
        },
        onError: (error) =>
          toast.error(errorMessage(error, words.prepareFailed)),
      }
    )
  }

  const startOver = () => {
    setLines([])
    setCustomer(EMPTY_CUSTOMER)
    setSource(null)
    setAttempted(false)
    setReview(null)
    setReviewKey((key) => key + 1)
    workingCartId.current = null
  }

  const onPlaced = (order: PlacedOrder) => {
    toast.success(
      cheer(words.created(order.display_id ? ` #${order.display_id}` : ""), "created")
    )
    startOver()
    navigate(`/orders/${order.id}`)
  }

  const units = unitCount(lines)
  // With the last product gone there is nothing to review, and no button to
  // ask with: what a past attempt found wrong goes quiet again, and stays
  // quiet when products come back, until the next review.
  useEffect(() => {
    if (units === 0) {
      setAttempted(false)
    }
  }, [units])
  const showErrors = attempted && units > 0

  return (
    <div className="flex flex-col gap-y-3" data-y2k-ready>
      <Container className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="flex flex-col gap-1">
          <Heading>{words.title}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.intro}
          </Text>
        </div>
        {!blank && (
          <Button size="small" variant="secondary" className="shrink-0" onClick={startOver}>
            {words.clear}
          </Button>
        )}
      </Container>

      <StoreCartsSection
        loaded={source}
        loadingId={loadingCart}
        onPick={pickCart}
        onClear={() => setSource(null)}
      />

      <ProductPicker
        lines={lines}
        currency={currency}
        onChange={setLines}
        onCurrency={setCurrency}
      />

      <CustomerFormSection
        customer={customer}
        errors={errors}
        showErrors={showErrors}
        onChange={(patch) => setCustomer((current) => ({ ...current, ...patch }))}
      />

      {/* The bar is the order so far and the way on to its review. With no
          products there is neither: it is not there until the first one is
          added, and it goes when the last one is taken out. */}
      {units > 0 && (
        <div className="y2k-actionbar flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <Text size="small" leading="compact" weight="plus">
              {words.unitsAndTotal(units, formatMoney(estimateSubtotal(lines), currency))}
            </Text>
            <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
              {words.plusShipping}
            </Text>
          </div>
          <Button
            size="large"
            className="shrink-0"
            onClick={onReview}
            isLoading={createCart.isPending}
            disabled={createCart.isPending}
          >
            {words.review}
          </Button>
        </div>
      )}

      <ReviewModal
        key={reviewKey}
        cart={review}
        onClose={() => setReview(null)}
        onCartChange={setReview}
        onPlaced={onPlaced}
      />
    </div>
  )
}

export const config = defineRouteConfig({
  // A key, not the words: Medusa looks it up in our menu labels (i18n/menu.ts).
  label: "menu.newOrder",
  translationNs: "y2k",
  icon: Plus,
  nested: "/orders",
})

export const handle = {
  breadcrumb: () => tr().manualOrder.title,
}

export default NuevoPedidoPage
