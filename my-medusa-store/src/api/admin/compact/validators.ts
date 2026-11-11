import { z } from "@medusajs/framework/zod"

/** Queries of `/admin/compact/*` (see `src/lib/compact.ts`). */

const queryInt = (min: number, max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    z.number().int().min(min).max(max).optional()
  )

export const CompactOrdersQuerySchema = z.object({
  view: z.enum(["all", "unpaid", "unfulfilled"]).optional(),
  q: z.string().max(120).optional(),
  limit: queryInt(1, 50),
  offset: queryInt(0, 100000),
})

export type CompactOrdersQuery = z.infer<typeof CompactOrdersQuerySchema>

export const CompactProductsQuerySchema = z.object({
  q: z.string().max(120).optional(),
  /** "published": what can be sold; "all": drafts and the rest too. */
  status: z.enum(["published", "all"]).optional(),
  limit: queryInt(1, 50),
  offset: queryInt(0, 100000),
})

export type CompactProductsQuery = z.infer<typeof CompactProductsQuerySchema>
