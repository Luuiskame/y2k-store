import { z } from "@medusajs/framework/zod"

/** Browsers send unpadded base64url; padding is dropped in case one does not. */
const base64Url = (min: number, max: number) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]+={0,2}$/)
    .transform((value) => value.replace(/=+$/, ""))
    .pipe(z.string().min(min).max(max))

/**
 * A browser `PushSubscription`, as `subscription.toJSON()` serializes it:
 * p256dh is a 65-byte P-256 public key (87 characters), auth a 16-byte secret
 * (22 characters).
 */
export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: base64Url(80, 100),
    auth: base64Url(16, 32),
  }),
})

export type PushSubscriptionBody = z.infer<typeof PushSubscriptionSchema>
