import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"

import { getProductPrice } from "@lib/util/get-product-price"
import OptionSelect from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
}) => {
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) return null
    const { variantPrice, cheapestPrice } = price
    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("lg:hidden inset-x-0 bottom-0 fixed z-50", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0 translate-y-full"
          enterTo="opacity-100 translate-y-0"
          leave="ease-in duration-300"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-full"
        >
          <div
            className="flex flex-col gap-y-3 p-4 w-full"
            style={{
              backgroundColor: "var(--brand-void-black)",
              borderTop: "1px solid var(--brand-amethyst)",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
            }}
            data-testid="mobile-actions"
          >
            <div className="flex items-center justify-between gap-x-3">
              <span
                className="font-heading uppercase tracking-[0.15em] text-sm text-brand-ghost-white truncate"
                data-testid="mobile-title"
              >
                {product.title}
              </span>
              {selectedPrice ? (
                <div className="flex items-baseline gap-x-2">
                  {selectedPrice.price_type === "sale" && (
                    <span className="line-through text-[11px] text-brand-silver-ash">
                      {selectedPrice.original_price}
                    </span>
                  )}
                  <span
                    className={clx(
                      "font-heading text-base",
                      selectedPrice.price_type === "sale"
                        ? "text-brand-divine-lilac"
                        : "text-brand-ghost-white"
                    )}
                  >
                    {selectedPrice.calculated_price}
                  </span>
                </div>
              ) : null}
            </div>
            <div
              className={clx("grid grid-cols-2 w-full gap-x-3", {
                "!grid-cols-1": isSimple,
              })}
            >
              {!isSimple && (
                <button
                  type="button"
                  onClick={open}
                  className="btn-ghost flex items-center justify-between"
                  data-testid="mobile-actions-button"
                >
                  <span className="text-xs uppercase tracking-[0.18em] truncate">
                    {variant
                      ? Object.values(options).join(" / ")
                      : "Talla"}
                  </span>
                  <ChevronDown />
                </button>
              )}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || !variant || isAdding}
                className="btn-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                data-testid="mobile-cart-button"
                aria-busy={isAdding}
              >
                {!variant
                  ? "Selecciona talla"
                  : !inStock
                  ? "Agotado"
                  : isAdding
                  ? "Añadiendo..."
                  : "Añadir"}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed bottom-0 inset-x-0">
            <div className="flex min-h-full h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-8"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-8"
              >
                <Dialog.Panel
                  className="w-full h-full transform overflow-hidden text-left flex flex-col gap-y-3"
                  data-testid="mobile-actions-modal"
                >
                  <div className="w-full flex justify-end pr-6">
                    <button
                      type="button"
                      onClick={close}
                      className="w-12 h-12 rounded-full flex justify-center items-center"
                      style={{
                        backgroundColor: "var(--brand-abyss-purple)",
                        color: "var(--brand-ghost-white)",
                        border: "1px solid var(--brand-amethyst)",
                      }}
                      data-testid="close-modal-button"
                      aria-label="Cerrar"
                    >
                      <X />
                    </button>
                  </div>
                  <div
                    className="px-6 py-12"
                    style={{
                      backgroundColor: "var(--brand-void-black)",
                      borderTop: "1px solid var(--brand-amethyst)",
                    }}
                  >
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => (
                          <div key={option.id}>
                            <OptionSelect
                              option={option}
                              current={options[option.id]}
                              updateOption={updateOptions}
                              title={option.title ?? ""}
                              disabled={optionsDisabled}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
