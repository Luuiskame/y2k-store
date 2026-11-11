import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  CART_TOTALS_FIELDS,
  MANUAL_ORDER_KEY,
  ManualOrderMetadata,
  SOURCE_CART_PLACED_KEY,
  SourceCartPlacedMark,
  carryOverMetadata,
  completionBlocker,
  readManualOrderMetadata,
} from "../../lib/manual-orders"

/* -------------------------------------------------------------------------- */
/* Building the working cart                                                  */
/* -------------------------------------------------------------------------- */

type ResolveContextInput = {
  actor_id: string
  country_code: string
  source_cart_id?: string | null
}

export type ManualOrderContext = {
  region_id: string
  sales_channel_id?: string
  customer_id?: string
  metadata: Record<string, unknown>
}

/**
 * Where the working cart is sold from. A sale that started in the storefront
 * keeps the customer's region, sales channel, customer record and cart
 * metadata, so the order is the one they would have placed themselves.
 * Otherwise the region is the one that sells to the delivery country, and
 * Medusa picks the store's default sales channel.
 */
export const resolveManualOrderContextStep = createStep(
  "resolve-manual-order-context",
  async (input: ResolveContextInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const own: ManualOrderMetadata = {
      created_by: input.actor_id,
      source: input.source_cart_id ? "store_cart" : "manual",
      ...(input.source_cart_id ? { source_cart_id: input.source_cart_id } : {}),
    }

    if (input.source_cart_id) {
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id", "region_id", "sales_channel_id", "customer_id", "metadata"],
        filters: { id: input.source_cart_id },
      })
      const cart = carts[0] as any

      if (!cart || readManualOrderMetadata(cart.metadata)) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "No se encontró ese carrito de la tienda."
        )
      }

      if (cart.region_id) {
        return new StepResponse<ManualOrderContext>({
          region_id: cart.region_id,
          sales_channel_id: cart.sales_channel_id ?? undefined,
          customer_id: cart.customer_id ?? undefined,
          metadata: { ...carryOverMetadata(cart.metadata), [MANUAL_ORDER_KEY]: own },
        })
      }
    }

    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id", "countries.iso_2"],
    })
    const region = (regions as any[]).find((candidate) =>
      (candidate.countries ?? []).some(
        (country: any) => country?.iso_2 === input.country_code
      )
    )

    if (!region) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `La tienda no vende a ese país (${input.country_code.toUpperCase()}). Revisá las regiones en Ajustes.`
      )
    }

    return new StepResponse<ManualOrderContext>({
      region_id: region.id,
      metadata: { [MANUAL_ORDER_KEY]: own },
    })
  }
)

type AssertWorkingCartInput = { cart_id: string }

/** The cart must be one this feature built and still open. */
export const assertWorkingCartStep = createStep(
  "assert-manual-order-working-cart",
  async (input: AssertWorkingCartInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "completed_at", "metadata"],
      filters: { id: input.cart_id },
    })
    const cart = carts[0] as any

    if (!cart || !readManualOrderMetadata(cart.metadata)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No se encontró el pedido en preparación. Volvé a revisarlo."
      )
    }
    if (cart.completed_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Ese pedido ya fue creado."
      )
    }

    return new StepResponse({ id: cart.id as string })
  }
)

type DiscardWorkingCartInput = { cart_id: string }

/**
 * Drops the working cart a newer one replaces. Only carts this feature built
 * and never completed; anything else is left alone, without failing: this
 * is housekeeping, not part of the sale.
 */
export const discardWorkingCartStep = createStep(
  "discard-manual-order-working-cart",
  async (input: DiscardWorkingCartInput, { container }) => {
    const cartModule = container.resolve(Modules.CART)

    const [cart] = await cartModule.listCarts(
      { id: [input.cart_id] },
      { select: ["id", "completed_at", "metadata"] }
    )

    if (!cart || cart.completed_at || !readManualOrderMetadata(cart.metadata)) {
      return new StepResponse({ discarded: false }, null)
    }

    await cartModule.softDeleteCarts([cart.id])
    return new StepResponse({ discarded: true }, cart.id)
  },
  async (cartId: string | null, { container }) => {
    if (!cartId) {
      return
    }
    await container.resolve(Modules.CART).restoreCarts([cartId])
  }
)

/* -------------------------------------------------------------------------- */
/* Completing it                                                              */
/* -------------------------------------------------------------------------- */

type LoadCompletableCartInput = { cart_id: string }

export type CompletableCart = {
  id: string
  total: number
  payment_collection_id: string | null
  manual_order: ManualOrderMetadata
}

/**
 * Loads the working cart with its total and refuses to go on unless it can
 * become an order: built here, with products, a phone, an address and a
 * shipping method.
 */
export const loadCompletableCartStep = createStep(
  "load-manual-order-completable-cart",
  async (input: LoadCompletableCartInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "completed_at",
        "metadata",
        ...CART_TOTALS_FIELDS,
        "shipping_address.phone",
        "shipping_address.address_1",
        "payment_collection.id",
      ],
      filters: { id: input.cart_id },
    })
    const cart = carts[0] as any

    if (cart?.completed_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Ese pedido ya fue creado."
      )
    }

    const blocker = completionBlocker(cart)
    if (blocker) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, blocker)
    }

    return new StepResponse<CompletableCart>({
      id: cart.id,
      total: Number(cart.total) || 0,
      payment_collection_id: cart.payment_collection?.id ?? null,
      manual_order: readManualOrderMetadata(cart.metadata)!,
    })
  }
)

type SetCartMetadataInput = {
  cart_id: string
  metadata: Record<string, unknown>
}

/**
 * Writes metadata keys on a cart. Medusa merges metadata key by key, so the
 * undo puts back the previous value of each key written, or removes the key
 * (an empty string does that) when it was not there before.
 */
export const setCartMetadataStep = createStep(
  "set-manual-order-cart-metadata",
  async (input: SetCartMetadataInput, { container }) => {
    const cartModule = container.resolve(Modules.CART)

    const before = await cartModule.retrieveCart(input.cart_id, {
      select: ["id", "metadata"],
    })
    const previous: Record<string, unknown> = {}
    for (const key of Object.keys(input.metadata)) {
      previous[key] = before.metadata?.[key] ?? ""
    }

    await cartModule.updateCarts(input.cart_id, { metadata: input.metadata })

    return new StepResponse(
      { id: input.cart_id },
      { cart_id: input.cart_id, previous }
    )
  },
  async (
    undo: { cart_id: string; previous: Record<string, unknown> } | undefined,
    { container }
  ) => {
    if (!undo) {
      return
    }
    await container
      .resolve(Modules.CART)
      .updateCarts(undo.cart_id, { metadata: undo.previous })
  }
)

type MarkSourceCartInput = {
  source_cart_id?: string | null
  order_id: string
}

export type PlacedOrderRef = { id: string; display_id: number | null }

/**
 * Reads the new order's number and, when the sale started in the storefront,
 * notes it on the customer's cart so the list of carts stops offering it.
 *
 * It runs after the order exists, so it never throws: a failure here would
 * roll the whole order back over a label.
 */
export const noteOrderOnSourceCartStep = createStep(
  "note-manual-order-on-source-cart",
  async (input: MarkSourceCartInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    let displayId: number | null = null

    try {
      const order = await container
        .resolve(Modules.ORDER)
        .retrieveOrder(input.order_id, { select: ["id", "display_id"] })
      displayId = (order as any).display_id ?? null
    } catch (err) {
      logger.warn(
        `manual-orders: could not read the number of order ${input.order_id}: ${err}`
      )
    }

    if (input.source_cart_id) {
      try {
        const mark: SourceCartPlacedMark = {
          order_id: input.order_id,
          display_id: displayId,
          at: new Date().toISOString(),
        }
        await container.resolve(Modules.CART).updateCarts(input.source_cart_id, {
          metadata: { [SOURCE_CART_PLACED_KEY]: mark },
        })
      } catch (err) {
        logger.warn(
          `manual-orders: could not note order ${input.order_id} on cart ${input.source_cart_id}: ${err}`
        )
      }
    }

    return new StepResponse<PlacedOrderRef, string | null>(
      { id: input.order_id, display_id: displayId },
      input.source_cart_id ?? null
    )
  },
  async (sourceCartId: string | null | undefined, { container }) => {
    if (!sourceCartId) {
      return
    }
    try {
      await container
        .resolve(Modules.CART)
        .updateCarts(sourceCartId, { metadata: { [SOURCE_CART_PLACED_KEY]: "" } })
    } catch {
      // The order is being rolled back; a stale label is the smaller problem.
    }
  }
)
