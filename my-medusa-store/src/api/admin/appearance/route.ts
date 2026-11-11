import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { readAppearance, saveAppearance } from "../../../lib/admin-appearance"
import type { AppearanceBody } from "./validators"

/** The signed-in user's saved look, or null when they never chose one. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const appearance = await readAppearance(req.scope, req.auth_context.actor_id)
  res.json({ appearance })
}

/** Saves the signed-in user's look; nobody else's can be written from here. */
export async function POST(
  req: AuthenticatedMedusaRequest<AppearanceBody>,
  res: MedusaResponse
) {
  const appearance = await saveAppearance(
    req.scope,
    req.auth_context.actor_id,
    req.validatedBody
  )
  res.json({ appearance })
}
