"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Item from "@modules/cart/components/item"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  const sortedItems = (cartState?.items ?? [])
    .slice()
    .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full">
          <LocalizedClientLink
            className="text-brand-silver-ash hover:text-brand-divine-lilac transition-colors duration-200"
            href="/cart"
            data-testid="nav-cart-link"
          >{`Cart (${totalItems})`}</LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+1px)] right-0 w-[420px] rounded-large overflow-hidden"
            style={{
              background: "var(--brand-abyss-purple)",
              border: "1px solid var(--brand-amethyst)",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
              color: "var(--brand-ghost-white)",
            }}
            data-testid="nav-cart-dropdown"
          >
            <div
              className="px-5 py-3"
              style={{ borderBottom: "1px solid var(--brand-amethyst)" }}
            >
              <h3
                className="font-heading text-base tracking-wide"
                style={{ color: "var(--brand-ghost-white)" }}
              >
                Tu Carrito
              </h3>
            </div>

            {cartState && sortedItems.length ? (
              <>
                <div className="overflow-y-auto max-h-[420px] no-scrollbar px-5">
                  {sortedItems.map((item) => (
                    <Item
                      key={item.id}
                      item={item}
                      type="preview"
                      currencyCode={cartState.currency_code}
                    />
                  ))}
                </div>

                <div
                  className="px-5 py-4 flex flex-col gap-y-3"
                  style={{ borderTop: "1px solid var(--brand-amethyst)" }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-body"
                      style={{ color: "var(--brand-silver-ash)" }}
                    >
                      Subtotal{" "}
                      <span className="text-xs opacity-70">(sin impuestos)</span>
                    </span>
                    <span
                      className="font-heading text-lg"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                      style={{ color: "var(--brand-divine-lilac)" }}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <LocalizedClientLink
                    href="/cart"
                    data-testid="go-to-cart-button"
                  >
                    <button
                      type="button"
                      className="btn-glow w-full text-center"
                    >
                      Ir al carrito
                    </button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div className="px-5 py-12 flex flex-col items-center justify-center gap-y-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full font-heading text-sm"
                  style={{
                    background: "var(--brand-sacred-violet)",
                    color: "var(--brand-ghost-white)",
                    boxShadow: "0 0 16px rgba(155, 77, 202, 0.5)",
                  }}
                >
                  0
                </div>
                <span
                  className="text-sm font-body text-center"
                  style={{ color: "var(--brand-silver-ash)" }}
                >
                  Tu carrito está vacío.
                </span>
                <LocalizedClientLink href="/store" onClick={close}>
                  <button type="button" className="btn-ghost">
                    Explorar productos
                  </button>
                </LocalizedClientLink>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
