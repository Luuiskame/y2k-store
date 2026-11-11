import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  NOT_CONFIGURED_MESSAGE,
  describeDevice,
  getVapidConfig,
  isAllowedPushEndpoint,
  subscriptionId,
  toPushDevice,
  updateStoredSubscriptions,
  upsertSubscription,
} from "../../../../lib/admin-push"
import type { PushSubscriptionBody } from "../validators"

/**
 * Registers the device in hand for the signed-in user's sales alerts, or
 * refreshes it. Idempotent: the admin calls it again whenever the browser
 * holds a subscription the server does not list.
 */
export async function POST(
  req: AuthenticatedMedusaRequest<PushSubscriptionBody>,
  res: MedusaResponse
) {
  const vapid = getVapidConfig()
  if (!vapid) {
    return res.status(409).json({ message: NOT_CONFIGURED_MESSAGE })
  }

  const { endpoint, keys } = req.validatedBody
  if (!isAllowedPushEndpoint(endpoint)) {
    return res.status(400).json({
      message:
        "Este navegador usa un servicio de notificaciones que no reconocemos.",
    })
  }

  const devices = await updateStoredSubscriptions(
    req.scope,
    req.auth_context.actor_id,
    (current) =>
      upsertSubscription(current, {
        endpoint,
        keys,
        device: describeDevice(req.get("user-agent")),
        vapid_key: vapid.publicKey,
      })
  )

  const saved = devices.find((device) => device.id === subscriptionId(endpoint))
  res.json({ device: saved ? toPushDevice(saved, vapid) : null })
}
