import { HttpTypes } from "@medusajs/types"

import EmptyCartMessage from "../components/empty-cart-message"
import FreeShippingBar from "../components/free-shipping-bar"
import SignInPrompt from "../components/sign-in-prompt"
import SuggestedProducts from "../components/suggested-products"
import TrustBadges from "../components/trust-badges"
import ItemsTemplate from "./items"
import Summary from "./summary"

type CartTemplateProps = {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  countryCode: string
}

const CartTemplate = ({ cart, customer, countryCode }: CartTemplateProps) => {
  const hasItems = !!cart?.items?.length
  const itemSubtotal = cart?.item_subtotal ?? 0
  const currency = cart?.currency_code ?? "hnl"
  const itemProductIds =
    cart?.items?.map((i) => i.product_id).filter(Boolean) as string[] | undefined

  return (
    <div className="py-10 small:py-14">
      <div className="content-container" data-testid="cart-container">
        {hasItems ? (
          <>
            <div className="grid grid-cols-1 small:grid-cols-[1fr_380px] gap-x-10 gap-y-8">
              <div className="flex flex-col gap-y-5 min-w-0">
                <FreeShippingBar
                  subtotal={itemSubtotal}
                  currencyCode={currency}
                />
                {!customer && <SignInPrompt />}
                <ItemsTemplate cart={cart!} />
                <TrustBadges />
              </div>

              <aside className="relative">
                <div className="sticky top-24">
                  {cart && cart.region && (
                    <Summary cart={cart as any} />
                  )}
                </div>
              </aside>
            </div>

            <SuggestedProducts
              countryCode={countryCode}
              excludeIds={itemProductIds ?? []}
            />
          </>
        ) : (
          <>
            <EmptyCartMessage />
            <SuggestedProducts countryCode={countryCode} />
          </>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
