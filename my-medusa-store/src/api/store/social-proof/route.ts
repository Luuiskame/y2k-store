import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/* Public buyer count for the storefront's trust bar.
 *
 * Returns a single number. No order details, no emails, no totals ever leave
 * this route — it is unauthenticated, so it must stay a bare aggregate.
 *
 * Cached in-process for CACHE_TTL_MS because the storefront renders it on every
 * product page and the number moves a few times a day at most. The storefront
 * caches it again on its own side (see `lib/data/social-proof.ts`), so the real
 * query runs a handful of times per day.
 */

/** Marketing multiplier applied to the paid-order count. Set to 1 to show the
 *  literal number of paid orders. */
const ORDER_MULTIPLIER = 3

/** Don't advertise a number until there's a real base under it. */
const MIN_ORDERS_TO_SHOW = 5

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

type Cached = { value: number; expiresAt: number }
let cache: Cached | null = null

const countPaidOrders = async (req: MedusaRequest): Promise<number> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // An order counts when it has at least one captured payment and wasn't
  // cancelled — pending BAC transfers and abandoned carts are excluded.
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status", "payment_collections.payments.captured_at"],
    filters: {},
  })

  return orders.filter((order: any) => {
    if (order.status === "canceled") {
      return false
    }
    return (order.payment_collections ?? [])
      .flatMap((pc: any) => pc?.payments ?? [])
      .some((payment: any) => Boolean(payment?.captured_at))
  }).length
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (cache && cache.expiresAt > Date.now()) {
    return res.json({ buyers: cache.value, cached: true })
  }

  try {
    const paidOrders = await countPaidOrders(req)

    const buyers =
      paidOrders >= MIN_ORDERS_TO_SHOW ? paidOrders * ORDER_MULTIPLIER : 0

    cache = { value: buyers, expiresAt: Date.now() + CACHE_TTL_MS }

    return res.json({ buyers, cached: false })
  } catch (error) {
    logger.error(`[social-proof] count failed: ${error}`)

    // Never fail the product page over a decorative number.
    return res.json({ buyers: cache?.value ?? 0, cached: Boolean(cache) })
  }
}
