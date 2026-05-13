"use client"

import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import PromoCode from "@modules/cart/components/promo-code"
import WhatsAppButton from "@modules/cart/components/whatsapp-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) return "address"
  if (cart?.shipping_methods?.length === 0) return "delivery"
  return "payment"
}

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)
  const currency_code = cart.currency_code

  const itemSubtotal = cart.item_subtotal ?? 0
  const shipping = cart.shipping_subtotal ?? 0
  const taxes = cart.tax_total ?? 0
  const discount = cart.discount_total ?? 0
  const total = cart.total ?? 0

  const fmt = (amount: number) =>
    convertToLocale({ amount, currency_code })

  return (
    <div
      className="rounded-large p-5 small:p-6 flex flex-col gap-y-5"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <h2
        className="font-heading text-xl small:text-2xl"
        style={{ color: "var(--brand-ghost-white)" }}
      >
        Resumen del pedido
      </h2>

      <div
        className="flex flex-col gap-y-2.5 text-sm font-body"
        style={{ color: "var(--brand-silver-ash)" }}
      >
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span
            data-testid="cart-subtotal"
            data-value={itemSubtotal}
            style={{ color: "var(--brand-ghost-white)" }}
          >
            {fmt(itemSubtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>Envío</span>
          <span data-testid="cart-shipping" data-value={shipping}>
            {shipping > 0 ? (
              <span style={{ color: "var(--brand-ghost-white)" }}>
                {fmt(shipping)}
              </span>
            ) : (
              <span style={{ color: "var(--brand-divine-lilac)" }}>
                Calculado al pagar
              </span>
            )}
          </span>
        </div>

        {!!discount && (
          <div className="flex items-center justify-between">
            <span>Descuento</span>
            <span
              data-testid="cart-discount"
              data-value={discount}
              style={{ color: "var(--brand-divine-lilac)" }}
            >
              − {fmt(discount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span>Impuestos</span>
          <span
            data-testid="cart-taxes"
            data-value={taxes}
            style={{ color: "var(--brand-ghost-white)" }}
          >
            {fmt(taxes)}
          </span>
        </div>
      </div>

      <PromoCode cart={cart} />

      <div
        className="h-px w-full"
        style={{ background: "var(--brand-amethyst)" }}
      />

      <div className="flex items-baseline justify-between">
        <span
          className="font-heading text-base"
          style={{ color: "var(--brand-ghost-white)" }}
        >
          Total
        </span>
        <span
          className="font-heading text-2xl"
          data-testid="cart-total"
          data-value={total}
          style={{ color: "var(--brand-divine-lilac)" }}
        >
          {fmt(total)}
        </span>
      </div>

      <div className="flex flex-col small:flex-row gap-2">
        <LocalizedClientLink
          href={"/checkout?step=" + step}
          data-testid="checkout-button"
          className="block flex-1"
        >
          <button
            type="button"
            className="btn-glow w-full text-center"
            style={{ width: "100%" }}
          >
            Finalizar compra
          </button>
        </LocalizedClientLink>

        <WhatsAppButton
          total={total}
          currencyCode={currency_code}
          itemCount={cart.items?.reduce((s, i) => s + (i.quantity ?? 0), 0)}
          className="flex-1"
        />
      </div>

      <p
        className="text-[11px] text-center font-body leading-snug -mt-2"
        style={{ color: "var(--brand-silver-ash)" }}
      >
        ¿Prefieres pagar por transferencia o coordinar entrega?
        <br />
        Escríbenos por WhatsApp y te ayudamos.
      </p>

      <div
        className="flex items-center justify-center gap-x-2 text-xs font-body"
        style={{ color: "var(--brand-silver-ash)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M12 2L4 6V12C4 16.4 7.6 20.4 12 22C16.4 20.4 20 16.4 20 12V6L12 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Pago 100% seguro · Datos cifrados</span>
      </div>

      <div className="flex items-center justify-center gap-x-2 pt-1 flex-wrap">
        <span
          className="text-[10px] uppercase tracking-wider mr-1"
          style={{ color: "var(--brand-silver-ash)" }}
        >
          Aceptamos
        </span>

        {/* Visa */}
        <svg
          width="42"
          height="28"
          viewBox="0 0 42 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Visa"
          role="img"
        >
          <rect width="42" height="28" rx="4" fill="#1A1F71" />
          <text
            x="21"
            y="19"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontWeight="700"
            fontStyle="italic"
            fontSize="13"
            fill="white"
            letterSpacing="0.5"
          >
            VISA
          </text>
        </svg>

        {/* Mastercard */}
        <svg
          width="42"
          height="28"
          viewBox="0 0 42 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Mastercard"
          role="img"
        >
          <rect width="42" height="28" rx="4" fill="#252525" />
          <circle cx="16" cy="14" r="8" fill="#EB001B" />
          <circle cx="26" cy="14" r="8" fill="#F79E1B" />
          <path
            d="M21 7.54a8 8 0 0 1 0 12.92A8 8 0 0 1 21 7.54z"
            fill="#FF5F00"
          />
        </svg>

        {/* BAC Credomatic */}
        <div
          className="flex items-center justify-center rounded px-2"
          style={{
            background: "#C8102E",
            height: "28px",
            minWidth: "70px",
          }}
        >
          <img
            src="/bac-credomatic.svg"
            alt="BAC Credomatic"
            style={{ height: "14px", width: "auto", filter: "brightness(0) invert(1)" }}
          />
        </div>
      </div>
    </div>
  )
}

export default Summary
