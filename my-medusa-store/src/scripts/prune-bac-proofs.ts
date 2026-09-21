import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3"

import { MAX_PROOFS_PER_ORDER, ProofFile } from "../lib/bac-proof"

/**
 * Trims BAC transfer proofs down to the per-order cap on orders that were
 * flooded before the cap existed, and optionally deletes the now-orphaned R2
 * objects.
 *
 * Dry run by default — it only prints what it would do.
 *
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts --order order_01ABC
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts --apply
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts --apply --delete-files
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts --apply --keep 3
 *
 * `--apply` rewrites order metadata (reversible only from a DB backup).
 * `--delete-files` additionally removes the objects from R2 (not reversible).
 * The kept proofs are the OLDEST ones, on the assumption that the genuine
 * receipt arrived first and the flood came after.
 */

const PROOF_FOLDER = "bank-transfers"

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
})

const flagValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

export default async function pruneBacProofs({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderService = container.resolve(Modules.ORDER)

  const apply = args.includes("--apply")
  const deleteFiles = args.includes("--delete-files")
  const onlyOrder = flagValue(args, "--order")
  const keep = Number(flagValue(args, "--keep") ?? MAX_PROOFS_PER_ORDER)

  if (!Number.isInteger(keep) || keep < 0) {
    logger.error(`--keep must be a non-negative integer, got "${keep}".`)
    return
  }

  if (deleteFiles && !apply) {
    logger.error("--delete-files requires --apply.")
    return
  }

  logger.info(
    `Pruning BAC proofs to ${keep} per order — ${
      apply ? "APPLY" : "DRY RUN"
    }${deleteFiles ? " + deleting R2 objects" : ""}`
  )

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "metadata"],
    ...(onlyOrder ? { filters: { id: onlyOrder } } : {}),
  })

  const bloated = (orders ?? []).filter((order: any) => {
    const proof = (order.metadata?.bac_transfer_proof ?? []) as ProofFile[]
    return Array.isArray(proof) && proof.length > keep
  })

  if (bloated.length === 0) {
    logger.info("No orders exceed the cap. Nothing to do.")
    return
  }

  for (const order of bloated as any[]) {
    const proof = (order.metadata.bac_transfer_proof ?? []) as ProofFile[]
    const kept = proof.slice(0, keep)
    const dropped = proof.slice(keep)

    logger.info(
      `Order #${order.display_id} (${order.id}): ${proof.length} proofs -> keeping ${kept.length}, dropping ${dropped.length}`
    )

    if (!apply) {
      continue
    }

    await orderService.updateOrders([
      {
        id: order.id,
        metadata: {
          ...order.metadata,
          bac_transfer_proof: kept,
          bac_transfer_proof_pruned_at: new Date().toISOString(),
          bac_transfer_proof_pruned_count: dropped.length,
        },
      } as any,
    ])

    if (!deleteFiles) {
      continue
    }

    // Delete by listing the order's prefix rather than by parsing the stored
    // URLs: the flood may have written objects that never made it into
    // metadata, and the prefix is scoped to this one order either way.
    const keptKeys = new Set(
      kept.map((p) => {
        try {
          return decodeURIComponent(new URL(p.url).pathname.replace(/^\//, ""))
        } catch {
          return ""
        }
      })
    )

    let continuationToken: string | undefined
    let deleted = 0

    do {
      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET,
          Prefix: `${PROOF_FOLDER}/${order.id}/`,
          ContinuationToken: continuationToken,
        })
      )

      const toDelete = (listed.Contents ?? [])
        .map((o) => o.Key!)
        .filter((key) => key && !keptKeys.has(key))

      // DeleteObjects takes at most 1000 keys per call.
      for (let i = 0; i < toDelete.length; i += 1000) {
        const chunk = toDelete.slice(i, i + 1000)
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: process.env.R2_BUCKET,
            Delete: { Objects: chunk.map((Key) => ({ Key })) },
          })
        )
        deleted += chunk.length
      }

      continuationToken = listed.IsTruncated
        ? listed.NextContinuationToken
        : undefined
    } while (continuationToken)

    logger.info(`  deleted ${deleted} object(s) from R2`)
  }

  if (!apply) {
    logger.info(
      `Dry run complete: ${bloated.length} order(s) would be pruned. Re-run with --apply to write.`
    )
  } else {
    logger.info(`Pruned ${bloated.length} order(s).`)
  }
}
