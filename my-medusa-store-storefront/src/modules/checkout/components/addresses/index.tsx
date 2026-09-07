"use client"

import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text, useToggleState } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  return (
    <div className="bg-brand-abyss-purple border border-brand-amethyst rounded-large p-4 small:p-6 text-brand-ghost-white">
      <div className="flex flex-row items-center justify-between gap-x-4 mb-6">
        <Heading
          level="h2"
          className="flex flex-row text-2xl-regular small:text-3xl-regular gap-x-2 items-baseline text-brand-ghost-white"
        >
          Dirección de envío
          {!isOpen && (
            <CheckCircleSolid className="text-brand-sacred-violet shrink-0" />
          )}
        </Heading>
        {!isOpen && cart?.shipping_address && (
          <Text>
            <button
              onClick={handleEdit}
              className="-mr-2 px-2 py-2 shrink-0 text-brand-sacred-violet hover:text-brand-divine-lilac transition-colors"
              data-testid="edit-address-button"
            >
              Editar
            </button>
          </Text>
        )}
      </div>
      {isOpen ? (
        <form action={formAction}>
          <div className="pb-4 small:pb-8">
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div>
                <Heading
                  level="h2"
                  className="text-2xl-regular small:text-3xl-regular gap-x-4 pb-6 pt-8 text-brand-ghost-white"
                >
                  Dirección de facturación
                </Heading>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton
              className="mt-6 w-full small:w-auto"
              data-testid="submit-address-button"
            >
              Continuar a envío
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && cart.shipping_address ? (
              <div className="flex items-start gap-x-8">
                <div className="flex flex-col gap-y-6 small:flex-row small:items-start small:gap-x-1 small:gap-y-0 w-full">
                  <div
                    className="flex flex-col w-full small:w-1/3"
                    data-testid="shipping-address-summary"
                  >
                    <Text className="txt-medium-plus text-brand-ghost-white mb-1">
                      Dirección de envío
                    </Text>
                    <Text className="txt-medium text-brand-silver-ash">
                      {cart.shipping_address.first_name}{" "}
                      {cart.shipping_address.last_name}
                    </Text>
                    <Text className="txt-medium text-brand-silver-ash">
                      {cart.shipping_address.address_1}
                    </Text>
                    {cart.shipping_address.address_2 && (
                      <Text className="txt-medium text-brand-silver-ash">
                        {cart.shipping_address.address_2}
                      </Text>
                    )}
                    {cart.shipping_address.company && (
                      <Text className="txt-medium text-brand-silver-ash">
                        {cart.shipping_address.company}
                      </Text>
                    )}
                    <Text className="txt-medium text-brand-silver-ash">
                      {[
                        cart.shipping_address.city,
                        cart.shipping_address.province,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </div>

                  <div
                    className="flex flex-col w-full small:w-1/3"
                    data-testid="shipping-contact-summary"
                  >
                    <Text className="txt-medium-plus text-brand-ghost-white mb-1">
                      Contacto
                    </Text>
                    <Text className="txt-medium text-brand-silver-ash">
                      {cart.shipping_address.phone}
                    </Text>
                    <Text className="txt-medium text-brand-silver-ash break-words">
                      {cart.email}
                    </Text>
                  </div>

                  <div
                    className="flex flex-col w-full small:w-1/3"
                    data-testid="billing-address-summary"
                  >
                    <Text className="txt-medium-plus text-brand-ghost-white mb-1">
                      Dirección de facturación
                    </Text>

                    {sameAsBilling ? (
                      <Text className="txt-medium text-brand-silver-ash">
                        Misma dirección de envío y facturación.
                      </Text>
                    ) : (
                      <>
                        <Text className="txt-medium text-brand-silver-ash">
                          {cart.billing_address?.first_name}{" "}
                          {cart.billing_address?.last_name}
                        </Text>
                        <Text className="txt-medium text-brand-silver-ash">
                          {cart.billing_address?.address_1}
                        </Text>
                        {cart.billing_address?.address_2 && (
                          <Text className="txt-medium text-brand-silver-ash">
                            {cart.billing_address.address_2}
                          </Text>
                        )}
                        {cart.billing_address?.company && (
                          <Text className="txt-medium text-brand-silver-ash">
                            {cart.billing_address.company}
                          </Text>
                        )}
                        <Text className="txt-medium text-brand-silver-ash">
                          {[
                            cart.billing_address?.city,
                            cart.billing_address?.province,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </Text>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Spinner />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Addresses
