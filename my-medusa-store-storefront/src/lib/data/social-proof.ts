import "server-only"

import { sdk } from "@lib/config"

/* Buyer count for the PDP trust bar.
 *
 * Hits the backend's `/store/social-proof` aggregate, which is itself cached
 * for an hour. Layered with the 6h revalidate below, the underlying order query
 * runs a few times a day no matter how much product-page traffic arrives.
 *
 * Returns 0 whenever the number is unavailable or too small to be worth
 * showing; the caller renders names without a count in that case. */

const REVALIDATE_SECONDS = 60 * 60 * 6

export const getBuyerCount = async (): Promise<number> => {
  try {
    const { buyers } = await sdk.client.fetch<{ buyers: number }>(
      "/store/social-proof",
      {
        method: "GET",
        next: { revalidate: REVALIDATE_SECONDS },
        cache: "force-cache",
      }
    )

    return Number.isFinite(buyers) && buyers > 0 ? Math.floor(buyers) : 0
  } catch (error) {
    console.warn(
      `[social-proof] buyer count unavailable: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    )
    return 0
  }
}
