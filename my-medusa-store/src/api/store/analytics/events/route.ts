import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  classifyDevice,
  classifySource,
  isBot,
  normalizeCity,
  normalizeCountry,
  normalizePage,
} from "../../../../lib/analytics/classify"
import { sharedTraffic } from "../../../../lib/analytics/traffic"
import { isInternalRequest } from "../../../../lib/rate-limit"
import { AnalyticsEventBody } from "./validators"

/**
 * During a Redis outage every beacon fails; one line every 10 s says so.
 */
let lastFailureLog = 0

/**
 * Receives the storefront's visitor beacons (page views, pings, add-to-cart,
 * WhatsApp clicks) for the admin dashboard's live view and traffic figures.
 *
 * Always answers 204 once the request is accepted, recorded or not: the
 * browser fires these with `sendBeacon` and never reads the answer, and a
 * dashboard counter is not worth an error anywhere near a shopper.
 */
export async function POST(
  req: MedusaRequest<AnalyticsEventBody>,
  res: MedusaResponse
) {
  // Only the storefront's own route handler writes here. It is what adds the
  // geolocation and drops same-site referrers, and it proves itself with the
  // shared secret. With no secret configured (local development) there is
  // nothing to check against — the same fail-open rule the rate limiter keeps.
  if (process.env.STOREFRONT_SHARED_SECRET && !isInternalRequest(req)) {
    return res
      .status(403)
      .json({ message: "Solo la tienda puede enviar estadísticas." })
  }

  const body = req.validatedBody

  if (isBot(body.ua)) {
    return res.sendStatus(204)
  }

  try {
    await sharedTraffic().store.record({
      type: body.type,
      visitorId: body.vid,
      sessionId: body.sid,
      page: normalizePage(body.path),
      device: classifyDevice(body.ua),
      source: classifySource({
        referrer: body.ref,
        utmSource: body.utm,
        clickId: body.clid,
        userAgent: body.ua,
      }),
      country: normalizeCountry(body.cc),
      city: normalizeCity(body.city),
      newVisitor: body.nv === true,
      hasCart: body.cart === true,
      loggedIn: body.auth === true,
    })
  } catch (error) {
    const now = Date.now()
    if (now - lastFailureLog > 10_000) {
      lastFailureLog = now
      req.scope
        .resolve(ContainerRegistrationKeys.LOGGER)
        .warn(`[analytics] beacon not recorded: ${(error as Error).message}`)
    }
  }

  return res.sendStatus(204)
}
