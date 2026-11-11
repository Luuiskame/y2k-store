import { z } from "@medusajs/framework/zod"

/**
 * Bodies and queries of `/admin/manual-orders/*`, the routes behind the
 * admin's "Nuevo pedido" page (see `src/lib/manual-orders.ts`).
 */

const id = z.string().trim().min(1).max(64)

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((value) => value ?? "")

/** A number sent in the query string. */
const queryInt = (min: number, max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    z.number().int().min(min).max(max).optional()
  )

const AddressSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: optionalText(120),
  // Seven digits is the shortest number anywhere; the page checks the rest.
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 7, {
      message: "El teléfono debe tener al menos 7 dígitos.",
    }),
  address_1: z.string().trim().min(1).max(300),
  address_2: optionalText(300),
  company: optionalText(300),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  postal_code: optionalText(20),
  country_code: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toLowerCase()),
})

export const CreateManualOrderCartSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: id,
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(40),
  // Most WhatsApp customers never give an email: empty means none.
  email: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().email().max(254).nullish()
  ),
  shipping_address: AddressSchema,
  promo_codes: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
  shipping_option_id: id.nullish(),
  source_cart_id: id.nullish(),
  replace_cart_id: id.nullish(),
})

export type CreateManualOrderCartBody = z.infer<
  typeof CreateManualOrderCartSchema
>

export const SetManualOrderShippingMethodSchema = z.object({
  option_id: id,
})

export type SetManualOrderShippingMethodBody = z.infer<
  typeof SetManualOrderShippingMethodSchema
>

export const CompleteManualOrderSchema = z.object({
  payment_method: z.enum(["contra_entrega", "transferencia_bac"]),
  apply_surcharge: z.boolean().optional(),
  note: z.string().max(500).nullish(),
})

export type CompleteManualOrderBody = z.infer<typeof CompleteManualOrderSchema>

export const StoreCartsQuerySchema = z.object({
  q: z.string().max(2000).optional(),
  limit: queryInt(1, 50),
})

export type StoreCartsQuery = z.infer<typeof StoreCartsQuerySchema>
