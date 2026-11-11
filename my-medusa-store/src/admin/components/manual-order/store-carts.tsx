import { DocumentText, XMarkMini } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { Link } from "react-router-dom"

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
            {cart.customer_name || "Sin nombre"}
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
              Ya es el pedido{cart.placed.display_id ? ` #${cart.placed.display_id}` : ""}
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
      toast.info("Pegá el mensaje en el buscador de abajo.", {
        description: "Este navegador no deja leer el portapapeles con un botón.",
      })
      return
    }
    const id = extractCartId(text)
    if (id) {
      onPick(id)
    } else {
      toast.warning("Ese texto no trae un carrito de la tienda.", {
        description:
          "Copiá el mensaje completo del cliente: termina con «Pedido #: cart_…».",
      })
    }
  }

  if (loaded) {
    const address = loaded.shipping_address
    return (
      <Container className="flex flex-col gap-3 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Text size="small" leading="compact" weight="plus">
              Desde el carrito de {address?.full_name || "un cliente"}
            </Text>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              Productos, dirección y envío vienen de lo que el cliente armó en la
              tienda ({formatMoney(loaded.total, loaded.currency_code)}). Podés
              cambiar lo que haga falta.
            </Text>
          </div>
          <Button size="small" variant="secondary" className="shrink-0" onClick={onClear}>
            <XMarkMini />
            Quitar
          </Button>
        </div>
        {(loaded.placed || loaded.completed) && (
          <Text size="small" leading="compact" className="text-ui-tag-orange-text">
            {loaded.placed ? (
              <>
                De este carrito ya salió{" "}
                <Link to={`/orders/${loaded.placed.order_id}`} className="underline">
                  el pedido{loaded.placed.display_id ? ` #${loaded.placed.display_id}` : ""}
                </Link>
                . Seguí solo si es un pedido distinto.
              </>
            ) : (
              "El cliente ya completó este carrito en la tienda. Seguí solo si es un pedido distinto."
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
          <Heading level="h2">¿Te escribió desde la tienda?</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Si llegó hasta el pago, su carrito ya trae productos, dirección y
            envío. Elegilo aquí o pegá su mensaje de WhatsApp.
          </Text>
        </div>
        <Button variant="secondary" className="shrink-0" onClick={onPaste}>
          <DocumentText />
          Pegar mensaje
        </Button>
      </div>

      <div className="px-6 py-4">
        <SearchField
          value={search}
          onChange={onSearch}
          placeholder="Nombre, teléfono o el mensaje pegado"
          label="Buscar carrito de la tienda"
        />
      </div>

      {query.isLoading ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Buscando carritos…
          </Text>
        </div>
      ) : query.isError ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-error">
            {errorMessage(query.error, "No se pudieron cargar los carritos.")}
          </Text>
        </div>
      ) : carts.length === 0 ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {q
              ? `Ningún carrito reciente coincide con «${q}».`
              : "No hay carritos recientes con datos de entrega. Armá el pedido abajo."}
          </Text>
        </div>
      ) : (
        <>
          <ul className="divide-y" aria-label="Carritos de la tienda">
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
                {expanded ? "Ver menos" : `Ver los ${carts.length} carritos`}
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  )
}
