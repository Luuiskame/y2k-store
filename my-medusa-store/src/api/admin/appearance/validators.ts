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
    // Added with the owner's own phrases: whether Estadísticas closes with
    // the motto and opens with a line of its own, and how big each is set.
    mottoOn: z.boolean().optional(),
    mottoSize: id.optional(),
    opener: z.string().max(200).optional(),
    openerOn: z.boolean().optional(),
    openerSize: id.optional(),
    /** The owner's lines for the ticker; null means the panel's originals. */
    phrases: z.array(z.string().max(200)).max(24).nullable().optional(),
  })
  .strict()

export type AppearanceBody = z.infer<typeof AppearanceSchema>
