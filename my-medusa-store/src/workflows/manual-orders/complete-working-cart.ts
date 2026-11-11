import {
  WorkflowResponse,
  createWorkflow,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  completeCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows"

import { buildContraEntregaMetadata } from "../../lib/contra-entrega"
import {
  MANUAL_ORDER_KEY,
  ManualOrderPaymentMethod,
  PAYMENT_PROVIDER_BY_METHOD,
} from "../../lib/manual-orders"
import {
  loadCompletableCartStep,
  noteOrderOnSourceCartStep,
  setCartMetadataStep,
} from "./steps"

export type CompleteManualOrderInput = {
  cart_id: string
  payment_method: ManualOrderPaymentMethod
  /** Contra entrega only: add the delivery company's 5% to what is collected. */
  apply_surcharge: boolean
  note?: string | null
}

/**
 * Turns a reviewed working cart into an order, the way the storefront's
 * checkout does (same workflow: stock is reserved, `order.placed` fires, so
 * the sales alert and the Meta Purchase go out as for any order).
 *
 * The payment is opened with the chosen method and left authorized, not
 * captured: the money has not arrived yet. The owner captures it from the
 * order page when the courier hands it over, or the transfer shows up.
 */
export const completeManualOrderWorkflow = createWorkflow(
  "complete-manual-order",
  function (input: CompleteManualOrderInput) {
    const loadInput = transform({ input }, ({ input }) => ({
      cart_id: input.cart_id,
    }))
    const cart = loadCompletableCartStep(loadInput)

    const createdCollection = when(
      { cart },
      ({ cart }) => !cart.payment_collection_id
    ).then(function () {
      const collectionInput = transform({ cart }, ({ cart }) => ({
        cart_id: cart.id,
      }))
      return createPaymentCollectionForCartWorkflow.runAsStep({
        input: collectionInput,
      })
    })

    const sessionInput = transform(
      { input, cart, createdCollection },
      ({ input, cart, createdCollection }) => ({
        payment_collection_id: (cart.payment_collection_id ??
          createdCollection?.id) as string,
        provider_id: PAYMENT_PROVIDER_BY_METHOD[input.payment_method],
      })
    )
    createPaymentSessionsWorkflow.runAsStep({ input: sessionInput })

    // Completing the cart copies its metadata to the order, so what the order
    // should say about itself is written on the cart first.
    const metadataInput = transform({ input, cart }, ({ input, cart }) => {
      const note = (input.note ?? "").trim()
      return {
        cart_id: cart.id,
        metadata: {
          [MANUAL_ORDER_KEY]: {
            ...cart.manual_order,
            payment_method: input.payment_method,
            ...(note ? { note } : {}),
          },
          ...(input.payment_method === "contra_entrega"
            ? {
                contra_entrega: buildContraEntregaMetadata(
                  cart.total,
                  input.apply_surcharge
                ),
              }
            : {}),
        } as Record<string, unknown>,
      }
    })
    setCartMetadataStep(metadataInput)

    const completeInput = transform({ cart }, ({ cart }) => ({ id: cart.id }))
    const placed = completeCartWorkflow.runAsStep({ input: completeInput })

    const noteInput = transform({ cart, placed }, ({ cart, placed }) => ({
      source_cart_id: cart.manual_order.source_cart_id ?? null,
      order_id: placed.id,
    }))
    const order = noteOrderOnSourceCartStep(noteInput)

    return new WorkflowResponse(order)
  }
)
