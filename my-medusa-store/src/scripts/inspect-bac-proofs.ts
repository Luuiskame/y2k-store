import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ProofFile } from "../lib/bac-proof"

/**
 * Read-only. Prints the newest proof timestamps for an order so we can tell
 * whether uploads are still landing, and how fast.
 *
 *   npx medusa exec ./src/scripts/inspect-bac-proofs.ts order=order_01ABC
 */
export default async function inspectBacProofs({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const inline = args.find((a) => a.startsWith("order="))
  const onlyOrder = inline?.slice("order=".length)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "status", "metadata"],
    ...(onlyOrder ? { filters: { id: onlyOrder } } : {}),
  })

  if (!orders?.length) {
    logger.warn(
      `No order matched${onlyOrder ? ` id ${onlyOrder}` : ""} — deleted, or the id is wrong.`
    )
    return
  }

  for (const order of (orders ?? []) as any[]) {
    const proof = (order.metadata?.bac_transfer_proof ?? []) as ProofFile[]
    if (!Array.isArray(proof) || proof.length === 0) {
      logger.info(
        `Order #${order.display_id} (${order.id}): 0 proofs in metadata` +
          ` — status ${order.status}, bac_transfer_status ${
            order.metadata?.bac_transfer_status ?? "none"
          }, pruned_at ${order.metadata?.bac_transfer_proof_pruned_at ?? "never"}`
      )
      continue
    }

    const times = proof
      .map((p) => new Date(p.uploaded_at).getTime())
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)

    const newest = times[times.length - 1]
    const oldest = times[0]

    logger.info(`Order #${order.display_id} (${order.id})`)
    logger.info(`  status: ${order.status}`)
    logger.info(`  bac_transfer_status: ${order.metadata?.bac_transfer_status}`)
    logger.info(`  proofs in metadata: ${proof.length}`)
    logger.info(`  oldest upload: ${new Date(oldest).toISOString()}`)
    logger.info(`  newest upload: ${new Date(newest).toISOString()}`)
    logger.info(
      `  newest was ${((Date.now() - newest) / 1000).toFixed(0)}s ago (now ${new Date().toISOString()})`
    )
    logger.info(
      `  pruned_at: ${order.metadata?.bac_transfer_proof_pruned_at ?? "never"}`
    )

    // How many landed in the last 5 minutes, bucketed by minute.
    const cutoff = Date.now() - 5 * 60 * 1000
    const recent = times.filter((t) => t >= cutoff)
    logger.info(`  uploads in last 5 min: ${recent.length}`)

    const byMinute = new Map<string, number>()
    for (const t of recent) {
      const minute = new Date(t).toISOString().slice(0, 16)
      byMinute.set(minute, (byMinute.get(minute) ?? 0) + 1)
    }
    for (const [minute, count] of [...byMinute.entries()].sort()) {
      logger.info(`    ${minute}  ${count}`)
    }

    // Distinct timestamps tell us request count: one request stamps all of its
    // files with the same `uploaded_at`.
    logger.info(`  distinct upload timestamps: ${new Set(times).size}`)
  }
}
