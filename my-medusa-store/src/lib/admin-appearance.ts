import { updateUsersWorkflow } from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { userMetadataLock } from "./admin-push"

/**
 * What an admin user chose in "Ajustes → Apariencia" (palette, type set,
 * language, motto and a few switches), kept in the user's metadata next to
 * their push devices: no table, no migration, and it goes when the user does.
 *
 * Each browser keeps its own copy in localStorage and applies it before the
 * first paint; this copy is what a new phone or computer starts from. What
 * the values mean is the admin's business (`src/admin/theme/prefs.ts`): the
 * server stores them as given and the admin tolerates anything it reads back.
 */
export const APPEARANCE_METADATA_KEY = "y2k_theme"

export type Appearance = {
  palette: string
  font: string
  aura: boolean
  tabbar: boolean
  /** Also read by the server: the language of that user's push alerts. */
  lang?: "es" | "en"
  unified?: boolean
  motto?: string
  hype?: boolean
}

export const readAppearance = async (
  container: MedusaContainer,
  userId: string
): Promise<Appearance | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "metadata"],
    filters: { id: userId },
  })
  const stored = (data[0] as { metadata?: Record<string, unknown> | null } | undefined)
    ?.metadata?.[APPEARANCE_METADATA_KEY]

  return stored && typeof stored === "object" ? (stored as Appearance) : null
}

/**
 * Writes only its own key; Medusa merges the rest of the metadata back. Under
 * the same lock as the push devices, so neither write can drop the other.
 *
 * What is saved is laid over what was stored, not put in its place: a device
 * still running an earlier version of the panel does not know the newer
 * fields, and its save must not erase them (the language would silently go
 * back to Spanish on every other device).
 */
export const saveAppearance = async (
  container: MedusaContainer,
  userId: string,
  appearance: Appearance
): Promise<Appearance> => {
  const locking = container.resolve(Modules.LOCKING)
  let saved = appearance

  await locking.execute(
    userMetadataLock(userId),
    async () => {
      saved = { ...(await readAppearance(container, userId)), ...appearance }
      await updateUsersWorkflow(container).run({
        input: {
          updates: [{ id: userId, metadata: { [APPEARANCE_METADATA_KEY]: saved } }],
        },
      })
    },
    { timeout: 5 }
  )

  return saved
}
