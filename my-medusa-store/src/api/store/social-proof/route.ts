import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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

/**
 * After a failed count, how long to keep answering with the last good value
 * before asking the database again. Without it, a database that is struggling
 * gets this query again on every product page view.
 */
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000

type Cached = { value: number; expiresAt: number }
let cache: Cached | null = null

/**
 * The count in progress, if any. When the cache expires under traffic, every
 * request that arrives before the first count finishes waits for that same
 * count instead of starting its own.
 */
let inFlight: Promise<number> | null = null

/**
 * An order counts when it has at least one captured payment and wasn't
 * cancelled — pending BAC transfers and abandoned carts are excluded.
 *
 * Counted by Postgres rather than loaded and filtered here. The previous
 * version pulled every order with its payment collections and payments into
 * memory just to count them: transfer out of Neon that grew with every sale,
 * for a number that fits in one row. Same rules as that version, which went
 * through `query.graph`: soft-deleted orders, links, collections and payments
 * do not count.
 */
const countPaidOrders = async (req: MedusaRequest): Promise<number> => {
  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const row = await pg("order as o")
    .countDistinct({ count: "o.id" })
    .join("order_payment_collection as opc", "opc.order_id", "o.id")
    .join("payment_collection as pc", "pc.id", "opc.payment_collection_id")
    .join("payment as p", "p.payment_collection_id", "pc.id")
    .whereNull("o.deleted_at")
    .whereNot("o.status", "canceled")
    .whereNull("opc.deleted_at")
    .whereNull("pc.deleted_at")
    .whereNull("p.deleted_at")
    .whereNotNull("p.captured_at")
    .first()

  return Number(row?.count ?? 0)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  if (cache && cache.expiresAt > Date.now()) {
    return res.json({ buyers: cache.value, cached: true })
  }

  try {
    if (!inFlight) {
      inFlight = countPaidOrders(req).finally(() => {
        inFlight = null
      })
    }
    const paidOrders = await inFlight

    const buyers =
      paidOrders >= MIN_ORDERS_TO_SHOW ? paidOrders * ORDER_MULTIPLIER : 0

    cache = { value: buyers, expiresAt: Date.now() + CACHE_TTL_MS }

    return res.json({ buyers, cached: false })
  } catch (error) {
    logger.error(`[social-proof] count failed: ${error}`)

    // Never fail the product page over a decorative number.
    cache = {
      value: cache?.value ?? 0,
      expiresAt: Date.now() + RETRY_AFTER_FAILURE_MS,
    }

    return res.json({ buyers: cache.value, cached: true })
  }
}
