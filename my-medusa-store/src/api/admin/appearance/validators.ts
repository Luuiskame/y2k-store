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
  })
  .strict()

export type AppearanceBody = z.infer<typeof AppearanceSchema>
