import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

// Payload emitted by generateResetPasswordTokenWorkflow.
type PasswordResetEvent = {
  entity_id: string // the identifier — for emailpass this is the email
  actor_type: string // "customer" | "user" | ...
  token: string
  metadata?: Record<string, unknown>
}

export default async function authPasswordResetHandler({
  event,
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  const { entity_id: email, actor_type, token } = event.data

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // Admin users reset their password through the admin dashboard; only the
  // storefront customer flow is handled here.
  if (actor_type !== "customer") {
    return
  }

  if (!email || !token) {
    logger.warn("auth-password-reset: missing email or token in event payload")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notification = container.resolve(Modules.NOTIFICATION)

  // Best-effort personalization; never block the email if the lookup fails.
  let firstName: string | undefined
  try {
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["first_name"],
      filters: { email },
    })
    firstName = customers?.[0]?.first_name ?? undefined
  } catch (err) {
    logger.warn(`auth-password-reset: could not load customer for ${email}: ${err}`)
  }

  const baseUrl = (
    process.env.STOREFRONT_URL ?? "http://localhost:8000"
  ).replace(/\/$/, "")
  const countryCode = process.env.STOREFRONT_DEFAULT_COUNTRY ?? "hn"

  const resetUrl =
    `${baseUrl}/${countryCode}/reset-password` +
    `?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`

  try {
    await notification.createNotifications({
      to: email,
      channel: "email",
      template: "password-reset-customer",
      data: {
        first_name: firstName,
        reset_url: resetUrl,
      },
    })
    logger.info(`auth-password-reset: reset email queued for ${email}`)
  } catch (err) {
    logger.error(
      `auth-password-reset: failed to send reset email to ${email}: ${err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
