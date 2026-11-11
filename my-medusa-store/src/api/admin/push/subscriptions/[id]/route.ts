import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { updateStoredSubscriptions } from "../../../../../lib/admin-push"

/**
 * Stops alerts on one of the signed-in user's devices. Only their own list is
 * touched, so an id belonging to someone else simply matches nothing.
 */
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  await updateStoredSubscriptions(req.scope, req.auth_context.actor_id, (devices) =>
    devices.filter((device) => device.id !== id)
  )

  res.json({ id, object: "push_subscription", deleted: true })
}
