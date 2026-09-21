import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import crypto from "crypto"

// Payload emitted by generateResetPasswordTokenWorkflow.
type PasswordResetEvent = {
  entity_id: string // the identifier — for emailpass this is the email
  actor_type: string // "customer" | "user" | ...
  token: string
  metadata?: Record<string, unknown>
}

/**
 * At most one reset email per address inside this window.
 *
 * This is the guard that actually stops the abuse. "Olvidé mi contraseña"
 * submitted in a loop against one address is the same attack that emptied the
 * Resend quota on 2026-09-21 through the proof-upload endpoint, and it takes
 * the same thing down with it: the order confirmations and reset emails real
 * customers depend on.
 *
 * Five minutes, not longer: someone who genuinely did not get the mail will
 * try again, and making them wait a quarter of an hour is its own support
 * ticket.
 */
const RESET_DEDUPE_SECONDS = 5 * 60

/**
 * Account-wide ceiling on reset emails per day.
 *
 * The Resend free plan allows 100 sends a day. `bac-proof-uploaded` already
 * reserves 40 for receipt notifications; 20 here leaves ~40 for order
 * confirmations, payment-verified notices and status changes — the mail that
 * customers are actually waiting on. For a shop with ~20 visits a day, 20
 * resets is already far above any honest demand.
 */
const DAILY_RESET_EMAIL_BUDGET = 20

/** Budget counters are keyed by UTC date; two days of TTL covers the rollover. */
const BUDGET_TTL_SECONDS = 60 * 60 * 48

/**
 * The address ends up inside a Redis key, so it goes in hashed. An email is
 * personal data and does not belong in a key that shows up in `KEYS`, `MONITOR`
 * or a memory dump; it can also carry characters that mean something to a key
 * namespace. For counting, the digest is exactly as good.
 */
const addressKey = (email: string): string =>
  crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32)

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

  const cache = container.resolve(Modules.CACHE)

  // Both guards run before the customer lookup below: there is no point paying
  // for a database round trip on an email we have already decided to skip, and
  // a flood should not reach the database either.
  const dedupeKey = `auth-reset-notified:${addressKey(email)}`
  try {
    if (await cache.get(dedupeKey)) {
      logger.info(
        `auth-password-reset: already sent a reset email for this address within the last ${
          RESET_DEDUPE_SECONDS / 60
        } min, skipping`
      )
      return
    }
  } catch {
    // Cache unavailable: fall through and send. The budget check below is the
    // remaining guard.
  }

  const budgetKey = `auth-reset-email-budget:${new Date()
    .toISOString()
    .slice(0, 10)}`
  let sentToday = 0
  try {
    sentToday = (await cache.get<number>(budgetKey)) ?? 0
  } catch {
    // Treat an unreadable counter as zero rather than blocking resets entirely.
    // Locking real customers out of their account is worse than one day of
    // uncapped mail, and the dedupe above still holds per address.
  }

  if (sentToday >= DAILY_RESET_EMAIL_BUDGET) {
    logger.error(
      `auth-password-reset: daily reset-email budget (${DAILY_RESET_EMAIL_BUDGET}) exhausted, skipping reset email`
    )
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
    return
  }

  // Only charge the budget and arm the dedupe once mail actually went out, so
  // a Resend outage does not silently burn a customer's one attempt.
  try {
    await cache.set(dedupeKey, true, RESET_DEDUPE_SECONDS)
    await cache.set(budgetKey, sentToday + 1, BUDGET_TTL_SECONDS)
  } catch (err) {
    logger.warn(`auth-password-reset: could not record email budget: ${err}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
