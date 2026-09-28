import { z } from "@medusajs/framework/zod"

import { PRESETS } from "../../../lib/analytics/time"

/**
 * The period a report covers: a preset, resolved in the store's time zone, or
 * explicit `from`/`to` days (`YYYY-MM-DD`, both included). The days are checked
 * as real calendar dates when the range is resolved.
 */
export const AnalyticsRangeSchema = z.object({
  preset: z.enum(PRESETS).optional(),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
})

export type AnalyticsRangeQuery = z.infer<typeof AnalyticsRangeSchema>
