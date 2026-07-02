"use client"

import { useEffect, useRef } from "react"
import { HttpTypes } from "@medusajs/types"
import { trackViewContent } from "@lib/analytics/meta-events"

/**
 * Fires a Meta Pixel `ViewContent` event once per product view. Rendered inside
 * the (server) product template so it runs on every product page load and
 * re-fires when navigating between products.
 */
export default function ViewContentTracker({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const firedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!product?.id || firedFor.current === product.id) {
      return
    }
    firedFor.current = product.id
    trackViewContent(product)
  }, [product])

  return null
}
