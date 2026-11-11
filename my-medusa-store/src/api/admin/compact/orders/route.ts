import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows"

import { pendingWork, reportingCurrency } from "../../../../lib/analytics/sales"
import { orderMatchesView, toCompactOrder } from "../../../../lib/compact"
import type { CompactOrdersQuery } from "../validators"

const DEFAULT_LIMIT = 15

/**
 * "Por cobrar" and "Por despachar" cannot be asked of the database: Medusa
 * works both states out per order after loading it. So those views look
 * through the most recent open orders and keep the ones that match. An order
 * left unpaid or unshipped for longer than this many newer orders is not
 * found here; Medusa's own list still has it.
 */
const SCAN_LIMIT = 120

const FIELDS = [
  "id",
  "display_id",
  "status",
  "created_at",
  "total",
  "currency_code",
  "email",
  "metadata",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.country_code",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.canceled_at",
]

/**
 * Orders for the phone list: newest first, as small cards, optionally only
 * the ones still to collect or still to ship. The first page also carries
 * how many of each there are, for the filter pills.
 *
 * Goes through Medusa's own order-list workflow, so the payment and
 * fulfillment states are exactly the ones its order pages show.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { view = "all", q, limit, offset } = req.validatedQuery as CompactOrdersQuery

  const take = limit ?? DEFAULT_LIMIT
  const skip = offset ?? 0
  const search = (q ?? "").trim()
  const scanning = view !== "all"

  const { result } = await getOrdersListWorkflow(req.scope).run({
    input: {
      fields: FIELDS,
      variables: {
        filters: {
          is_draft_order: false,
          ...(search ? { q: search } : {}),
          ...(scanning ? { status: ["pending", "requires_action"] } : {}),
        },
        skip: scanning ? 0 : skip,
        take: scanning ? SCAN_LIMIT : take,
        order: { created_at: "DESC" },
      } as any,
    },
  })

  const { rows, metadata } = result as unknown as {
    rows: any[]
    metadata: { count: number }
  }

  const matching = scanning
    ? rows.filter((order) => orderMatchesView(order, view))
    : rows

  const page = scanning ? matching.slice(skip, skip + take) : matching
  const count = scanning ? matching.length : metadata.count

  let pending: Awaited<ReturnType<typeof pendingWork>> | null = null
  if (skip === 0 && !search) {
    try {
      const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      pending = await pendingWork(pg, await reportingCurrency(pg))
    } catch {
      // The pills lose their counts; the list is what matters.
    }
  }

  res.json({
    orders: page.map(toCompactOrder),
    count,
    offset: skip,
    limit: take,
    pending,
  })
}
