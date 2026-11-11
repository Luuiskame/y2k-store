import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  getVapidConfig,
  listUserDevices,
  toPushDevice,
} from "../../../lib/admin-push"

/**
 * What the admin needs to offer sales alerts on the device in hand: whether
 * the server can send them, the public key to subscribe with, and the devices
 * the signed-in user already has.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const vapid = getVapidConfig()
  const devices = await listUserDevices(req.scope, req.auth_context.actor_id)

  res.json({
    configured: vapid !== null,
    public_key: vapid?.publicKey ?? null,
    devices: devices.map((device) => toPushDevice(device, vapid)),
  })
}
