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
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts order=order_01ABC
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts apply
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts apply delete-files
 *   npx medusa exec ./src/scripts/prune-bac-proofs.ts apply keep=3
 *
 * `apply` rewrites order metadata (reversible only from a DB backup).
 * `delete-files` additionally removes the objects from R2 (not reversible).
 * The kept proofs are the OLDEST ones, on the assumption that the genuine
 * receipt arrived first and the flood came after.
 *
 * Note the bare words: `medusa exec` declares its script arguments as yargs
 * POSITIONALS on a strict parser, so a leading `--` is rejected by the CLI
 * before this file is ever loaded ("Unknown argument: apply"). Dashed spellings
 * are still accepted below for anyone who reaches for them out of habit.
 */

const PROOF_FOLDER = "bank-transfers"

/**
 * R2_ENDPOINT carries the bucket name in its PATH, not just its host:
 *
 *   https://<account>.r2.cloudflarestorage.com/y2k-fit-store-hn
 *
 * Object-level calls survive that — PutObject just appends the key to the
 * endpoint path — which is why uploads work and why every stored object's real
 * key is silently prefixed with "y2k-fit-store-hn/" (R2_FILE_URL carries the
 * same prefix, so the public URLs still resolve).
 *
 * Bucket-level calls do NOT survive it. ListObjectsV2 and DeleteObjects have to
 * address the bucket root; with that path appended they instead address an
 * object literally named "y2k-fit-store-hn", and R2 answers NoSuchKey (404).
 *
 * So split the endpoint: talk to the origin, and fold the path back in as a key
 * prefix. Leaving the deployed upload path alone on purpose — "fixing" the env
 * var would change the keys of every object already stored.
 */
const endpointUrl = new URL(process.env.R2_ENDPOINT as string)
const ENDPOINT_ORIGIN = endpointUrl.origin
const ENDPOINT_PATH_PREFIX = endpointUrl.pathname.replace(/^\/|\/$/g, "")

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT_ORIGIN,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
})

/** The real object-key prefix holding one order's proofs. */
const proofPrefix = (orderId: string) =>
  [ENDPOINT_PATH_PREFIX, PROOF_FOLDER, orderId]
    .filter(Boolean)
    .join("/") + "/"

/**
 * Lists everything under `prefix` and removes whatever is not in `keptKeys`.
 * With `apply` false it only counts, so the caller can confirm the prefix
 * resolves to what they expect before anything irreversible happens.
 */
const purgePrefix = async (
  prefix: string,
  keptKeys: Set<string>,
  apply: boolean
): Promise<{ objects: number; bytes: number; deleted: number }> => {
  let continuationToken: string | undefined
  let objects = 0
  let deleted = 0
  let bytes = 0

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    objects += listed.Contents?.length ?? 0

    const toDelete = (listed.Contents ?? [])
      .filter((o) => o.Key && !keptKeys.has(o.Key))
      .map((o) => {
        bytes += o.Size ?? 0
        return o.Key!
      })

    if (apply) {
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
    } else {
      deleted += toDelete.length
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined
  } while (continuationToken)

  return { objects, bytes, deleted }
}

/** Matches `name`, tolerating a `--` prefix. */
const hasFlag = (args: string[], name: string): boolean =>
  args.some((a) => a === name || a === `--${name}`)

/** Reads `name=value`, tolerating `--name=value` and `--name value`. */
const flagValue = (args: string[], name: string): string | undefined => {
  const inline = args.find(
    (a) => a.startsWith(`${name}=`) || a.startsWith(`--${name}=`)
  )
  if (inline) {
    return inline.slice(inline.indexOf("=") + 1)
  }

  const index = args.findIndex((a) => a === name || a === `--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

export default async function pruneBacProofs({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderService = container.resolve(Modules.ORDER)

  const apply = hasFlag(args, "apply")
  const deleteFiles = hasFlag(args, "delete-files")
  const onlyOrder = flagValue(args, "order")
  const keep = Number(flagValue(args, "keep") ?? MAX_PROOFS_PER_ORDER)

  if (!Number.isInteger(keep) || keep < 0) {
    logger.error(`keep must be a non-negative integer, got "${keep}".`)
    return
  }

  // `delete-files` without `apply` is allowed: it reports what would be
  // removed from R2 without touching anything. Useful for confirming the key
  // prefix is right before running an irreversible delete.

  // Orphan mode: purge an order's R2 prefix with no surviving order row to
  // read. Needed if the order is ever deleted — the objects outlive it, and
  // nothing else records where they are.
  //
  //   npx medusa exec ./src/scripts/prune-bac-proofs.ts orphans=order_01ABC
  //   npx medusa exec ./src/scripts/prune-bac-proofs.ts orphans=order_01ABC apply
  //
  // This keeps NOTHING — there is no metadata left to decide what is genuine,
  // so only run it once you are sure no receipt under the prefix matters.
  const orphanOrderId = flagValue(args, "orphans")
  if (orphanOrderId) {
    const prefix = proofPrefix(orphanOrderId)
    logger.info(
      `Orphan purge of ${prefix} — ${apply ? "APPLY" : "DRY RUN"} (keeps nothing)`
    )

    const { objects, bytes, deleted } = await purgePrefix(
      prefix,
      new Set<string>(),
      apply
    )

    logger.info(
      `  ${objects} object(s), ${
        apply ? `deleted ${deleted}` : `would delete ${deleted}`
      } (${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB)`
    )
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

    if (apply) {
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
    }

    if (!deleteFiles) {
      continue
    }

    // Work from a listing of the order's prefix rather than from the stored
    // URLs: the flood wrote objects that never made it into metadata (and an
    // earlier `apply` already dropped most of those URLs), so the prefix is the
    // only way to find them. It is scoped to this one order either way.
    const keptKeys = new Set(
      kept.map((p) => {
        try {
          return decodeURIComponent(new URL(p.url).pathname.replace(/^\//, ""))
        } catch {
          return ""
        }
      })
    )

    const prefix = proofPrefix(order.id)
    const { objects, bytes, deleted } = await purgePrefix(
      prefix,
      keptKeys,
      apply
    )

    logger.info(`  R2 prefix ${prefix}`)
    logger.info(
      `  ${objects} object(s) under prefix, ${
        apply ? `deleted ${deleted}` : `would delete ${deleted}`
      } (${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB), keeping ${keptKeys.size}`
    )
  }

  if (!apply) {
    logger.info(
      `Dry run complete: ${bloated.length} order(s) would be pruned. Re-run with "apply" to write.`
    )
  } else {
    logger.info(`Pruned ${bloated.length} order(s).`)
  }
}
