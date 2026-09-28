import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  pendingWork,
  reportingCurrency,
  salesReport,
} from "../../../../lib/analytics/sales"
import {
  InvalidRangeError,
  bucketsFor,
  currentBucket,
  describeRange,
  resolveRange,
} from "../../../../lib/analytics/time"
import { AnalyticsRangeQuery } from "../validators"

/**
 * Sales for the dashboard: totals against the comparison period, the series
 * for the chart, top products, payment methods, departments and customers,
 * plus what is waiting on the owner right now.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let range: ReturnType<typeof resolveRange>
  try {
    range = resolveRange(req.validatedQuery as AnalyticsRangeQuery)
  } catch (error) {
    if (error instanceof InvalidRangeError) {
      return res.status(400).json({ message: error.message })
    }
    throw error
  }

  const pg = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const currency = await reportingCurrency(pg)

  const [report, pending] = await Promise.all([
    salesReport(pg, {
      current: range.current,
      previous: range.previous,
      granularity: range.granularity,
      currentBuckets: bucketsFor(range.current, range.granularity),
      previousBuckets: bucketsFor(range.previous, range.granularity),
      lastBucket: currentBucket(range),
      currency,
    }),
    pendingWork(pg, currency),
  ])

  return res.json({ range: describeRange(range), ...report, pending })
}
