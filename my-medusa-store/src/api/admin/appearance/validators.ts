import { z } from "@medusajs/framework/zod"

/**
 * The look saved from "Ajustes → Apariencia". Ids are checked for shape
 * only: which palettes and type sets exist is decided in the admin
 * (`src/admin/theme/palettes.ts`), and it falls back to its defaults for any
 * id it does not know.
 */
const id = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/)

export const AppearanceSchema = z
  .object({
    palette: id,
    font: id,
    aura: z.boolean(),
    tabbar: z.boolean(),
    // Added after the first release. Optional, because a phone that still
    // runs the earlier panel saves without them (what was stored is kept:
    // see `saveAppearance`).
    lang: z.enum(["es", "en"]).optional(),
    unified: z.boolean().optional(),
    /** Free text set in big type; the panel cleans what it reads back. */
    motto: z.string().max(200).optional(),
    hype: z.boolean().optional(),
  })
  .strict()

export type AppearanceBody = z.infer<typeof AppearanceSchema>
