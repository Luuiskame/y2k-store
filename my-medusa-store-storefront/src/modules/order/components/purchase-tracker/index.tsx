"use client"

import { useEffect, useRef } from "react"
import { HttpTypes } from "@medusajs/types"
import { trackPurchase } from "@lib/analytics/meta-events"

/**
 * Fires a Meta Pixel `Purchase` event exactly once per placed order. Rendered on
 * the order-confirmed and BAC-transfer pages (both represent a placed order in
 * this store's cash-on-delivery / bank-transfer model).
 *
 * De-duplicated with a persistent localStorage key so a page refresh or revisit
 * of the confirmation URL never re-counts the conversion.
 */
export default function PurchaseTracker({
  order,
}: {
  order: HttpTypes.StoreOrder
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current || !order?.id) {
      return
    }

    const key = `mp_purchase_${order.id}`
    try {
      if (localStorage.getItem(key)) {
        return
      }
      localStorage.setItem(key, "1")
    } catch {
      // localStorage unavailable (private mode / SSR guard) — still fire once
      // per mount via the ref below rather than skipping the conversion.
    }

    fired.current = true
    trackPurchase(order)
  }, [order])

  return null
}
