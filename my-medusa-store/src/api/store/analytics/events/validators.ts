import { z } from "@medusajs/framework/zod"

import { CLICK_IDS } from "../../../../lib/analytics/classify"
import { EVENT_TYPES } from "../../../../lib/analytics/traffic"

/** Random ids the storefront generates; nothing else is accepted in a key. */
const ID = /^[A-Za-z0-9_-]{8,64}$/

/**
 * One beacon, as the storefront's `/api/analytics` route forwards it. The
 * browser supplies the first group; the route adds the rest from the request
 * (user agent, Vercel's geolocation headers, which cookies are present).
 *
 * Lengths are capped here and everything is normalized again before it is
 * stored: see `lib/analytics/classify.ts`.
 */
export const AnalyticsEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  vid: z.string().regex(ID),
  sid: z.string().regex(ID),
  path: z.string().max(512),
  ref: z.string().max(512).optional(),
  utm: z.string().max(64).optional(),
  clid: z.enum(CLICK_IDS).optional(),
  nv: z.boolean().optional(),

  ua: z.string().max(512).optional(),
  cc: z.string().max(8).optional(),
  city: z.string().max(120).optional(),
  cart: z.boolean().optional(),
  auth: z.boolean().optional(),
})

export type AnalyticsEventBody = z.infer<typeof AnalyticsEventSchema>
