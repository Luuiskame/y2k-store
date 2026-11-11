import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  NOT_CONFIGURED_MESSAGE,
  getVapidConfig,
  sendAdminAlert,
  testAlert,
} from "../../../../lib/admin-push"

/**
 * Sends a sample alert to the signed-in user's devices only, so turning
 * alerts on can be checked end to end without waiting for a sale.
 *
 * The folder is `sample/`, never `test/`: `medusa build` leaves out of the
 * server every file whose path contains "test", so the route worked under
 * `medusa develop` and answered 404 in production. `build-paths.unit.spec.ts`
 * guards against that.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  if (!getVapidConfig()) {
    return res.status(409).json({ message: NOT_CONFIGURED_MESSAGE })
  }

  const delivery = await sendAdminAlert(req.scope, testAlert(), {
    userIds: [req.auth_context.actor_id],
  })

  res.json(delivery)
}
