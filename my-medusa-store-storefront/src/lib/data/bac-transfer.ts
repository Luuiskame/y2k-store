"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getBacTransferStatus } from "@modules/order/util/bac-transfer"

import { getAuthHeaders, getPendingBacOrderId } from "./cookies"

// Only what the reminder banner + its modal need (bank card, uploader state and
// the WhatsApp message). Line items are deliberately left out — the full order
// lives on /order/[id]/transferencia-bac.
const PENDING_ORDER_FIELDS =
  "id,display_id,status,currency_code,total,metadata,created_at"

/**
 * The BAC order this browser still owes a transfer proof for, or `null`.
 *
 * Runs on every page of the main layout, but only performs a request for
 * customers who actually have the pending cookie, and it's uncached on purpose:
 * a stale "sube tu comprobante" after the payment was already verified is far
 * worse than one small request. The cookie expires on its own, so a verified
 * order simply stops matching here.
 */
export const retrievePendingBacOrder =
  async (): Promise<HttpTypes.StoreOrder | null> => {
    const id = await getPendingBacOrderId()

    if (!id) {
      return null
    }

    const headers = {
      ...(await getAuthHeaders()),
    }

    const order = await sdk.client
      .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
        method: "GET",
        query: { fields: PENDING_ORDER_FIELDS },
        headers,
        cache: "no-store",
      })
      .then(({ order }) => order)
      .catch(() => null)

    if (!order || order.status === "canceled") {
      return null
    }

    const status = getBacTransferStatus(order)

    if (status === "verified" || status === "rejected") {
      return null
    }

    return order
  }
