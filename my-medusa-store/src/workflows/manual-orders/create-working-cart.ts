import {
  WorkflowResponse,
  createWorkflow,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  addShippingMethodToCartWorkflow,
  createCartWorkflow,
  listShippingOptionsForCartWorkflow,
} from "@medusajs/medusa/core-flows"

import type {
  ManualOrderItemInput,
  NormalizedAddress,
} from "../../lib/manual-orders"
import {
  assertWorkingCartStep,
  discardWorkingCartStep,
  resolveManualOrderContextStep,
} from "./steps"

export type CreateManualOrderCartInput = {
  /** The admin user building the order. */
  actor_id: string
  items: ManualOrderItemInput[]
  email?: string | null
  shipping_address: NormalizedAddress
  promo_codes?: string[]
  /** Used when the cart can still ship that way; otherwise ignored. */
  shipping_option_id?: string | null
  /** The customer's storefront cart this order starts from, if any. */
  source_cart_id?: string | null
  /** The working cart of the previous review, which this one replaces. */
  replace_cart_id?: string | null
}

/**
 * Builds the working cart of an order being registered from the admin: the
 * same cart the storefront would build, so its prices, promotions, taxes and
 * stock checks are the real ones, and its totals can be reviewed before
 * anything is ordered.
 *
 * The shipping method is set when there is no choice to make: the one asked
 * for if the cart can ship that way, or the only one there is.
 */
export const createManualOrderCartWorkflow = createWorkflow(
  "create-manual-order-cart",
  function (input: CreateManualOrderCartInput) {
    const contextInput = transform({ input }, ({ input }) => ({
      actor_id: input.actor_id,
      country_code: input.shipping_address.country_code,
      source_cart_id: input.source_cart_id,
    }))
    const context = resolveManualOrderContextStep(contextInput)

    const cartInput = transform({ input, context }, ({ input, context }) => ({
      region_id: context.region_id,
      sales_channel_id: context.sales_channel_id,
      customer_id: context.customer_id,
      email: input.email || undefined,
      shipping_address: input.shipping_address,
      billing_address: input.shipping_address,
      items: input.items,
      promo_codes: input.promo_codes ?? [],
      metadata: context.metadata,
    }))

    const cart = createCartWorkflow.runAsStep({ input: cartInput as any })

    const optionsInput = transform({ cart }, ({ cart }) => ({ cart_id: cart.id }))
    const shippingOptions = listShippingOptionsForCartWorkflow.runAsStep({
      input: optionsInput,
    })

    const methodInput = transform(
      { input, cart, shippingOptions },
      ({ input, cart, shippingOptions }) => {
        const options = (shippingOptions ?? []) as { id: string }[]
        const asked = options.find(
          (option) => option.id === input.shipping_option_id
        )
        const chosen = asked ?? (options.length === 1 ? options[0] : undefined)
        return {
          cart_id: cart.id,
          options: chosen ? [{ id: chosen.id }] : [],
        }
      }
    )

    when({ methodInput }, ({ methodInput }) => methodInput.options.length > 0).then(
      function () {
        addShippingMethodToCartWorkflow.runAsStep({ input: methodInput })
      }
    )

    when({ input }, ({ input }) => !!input.replace_cart_id).then(function () {
      const discardInput = transform({ input }, ({ input }) => ({
        cart_id: input.replace_cart_id as string,
      }))
      discardWorkingCartStep(discardInput)
    })

    const result = transform(
      { cart, shippingOptions },
      ({ cart, shippingOptions }) => ({
        cart_id: cart.id as string,
        shipping_options: (shippingOptions ?? []) as any[],
      })
    )

    return new WorkflowResponse(result)
  }
)

export type SetManualOrderShippingMethodInput = {
  cart_id: string
  option_id: string
}

/** Changes how a working cart ships. Medusa rejects an option it can't use. */
export const setManualOrderShippingMethodWorkflow = createWorkflow(
  "set-manual-order-shipping-method",
  function (input: SetManualOrderShippingMethodInput) {
    const assertInput = transform({ input }, ({ input }) => ({
      cart_id: input.cart_id,
    }))
    const cart = assertWorkingCartStep(assertInput)

    const methodInput = transform({ input, cart }, ({ input, cart }) => ({
      cart_id: cart.id,
      options: [{ id: input.option_id }],
    }))
    addShippingMethodToCartWorkflow.runAsStep({ input: methodInput })

    const optionsInput = transform({ cart }, ({ cart }) => ({ cart_id: cart.id }))
    const shippingOptions = listShippingOptionsForCartWorkflow
      .runAsStep({ input: optionsInput })
      .config({ name: "list-shipping-options-after-change" })

    const result = transform(
      { cart, shippingOptions },
      ({ cart, shippingOptions }) => ({
        cart_id: cart.id,
        shipping_options: (shippingOptions ?? []) as any[],
      })
    )

    return new WorkflowResponse(result)
  }
)
