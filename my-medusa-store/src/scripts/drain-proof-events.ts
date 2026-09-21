import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Queue } from "bullmq"
import IORedis from "ioredis"

/**
 * Drains queued `bac_transfer.proof_uploaded` jobs from the Redis event bus.
 *
 * The flood enqueued one event per upload, and each event sends two emails
 * (customer + owner). Those jobs outlive the uploads: receipts stopped and the
 * order metadata was already pruned, yet the queue kept draining and kept
 * burning the daily Resend allowance. The backlog lives in YOUR Redis (BullMQ),
 * not at Resend — there is nothing to cancel on their side.
 *
 * Dry run by default.
 *
 *   npx medusa exec ./src/scripts/drain-proof-events.ts
 *   npx medusa exec ./src/scripts/drain-proof-events.ts apply
 *   npx medusa exec ./src/scripts/drain-proof-events.ts apply event=bac_transfer.proof_uploaded
 *
 * Only jobs matching the event name are removed, so order confirmations,
 * password resets and everything else in the shared queue are left alone.
 */

const DEFAULT_EVENT = "bac_transfer.proof_uploaded"
const QUEUE_NAME = process.env.EVENTS_QUEUE_NAME ?? "events-queue"

// Jobs already handed to a worker cannot be removed; they finish on their own.
const REMOVABLE_STATES = [
  "wait",
  "waiting",
  "delayed",
  "prioritized",
  "paused",
] as const

export default async function drainProofEvents({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const apply = args.some((a) => a === "apply" || a === "--apply")
  const eventArg = args.find((a) => a.startsWith("event="))
  const eventName = eventArg ? eventArg.slice("event=".length) : DEFAULT_EVENT

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    logger.error("REDIS_URL is not set; nothing to drain.")
    return
  }

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
  const queue = new Queue(QUEUE_NAME, { connection })

  try {
    const counts = await queue.getJobCounts()
    logger.info(`Queue "${QUEUE_NAME}" — ${apply ? "APPLY" : "DRY RUN"}`)
    logger.info(`  job counts: ${JSON.stringify(counts)}`)
    logger.info(`  targeting event: ${eventName}`)

    let scanned = 0
    let matched = 0
    let removed = 0
    const batch = 500

    // Walk from the end each pass when removing: indices shift as jobs go away.
    for (const state of REMOVABLE_STATES) {
      let start = 0

      for (;;) {
        let jobs
        try {
          jobs = await queue.getJobs([state as any], start, start + batch - 1)
        } catch {
          // Older/newer BullMQ may not know a given state name; skip it.
          break
        }

        if (!jobs.length) {
          break
        }

        scanned += jobs.length

        const targets = jobs.filter((j) => j?.name === eventName)
        matched += targets.length

        if (apply) {
          for (const job of targets) {
            try {
              await job.remove()
              removed++
            } catch (err) {
              logger.warn(`  could not remove job ${job.id}: ${err}`)
            }
          }
          // Removed jobs shift the window, so re-read from the same offset.
          if (targets.length === jobs.length) {
            continue
          }
        }

        start += batch
      }
    }

    logger.info(
      `  scanned ${scanned} queued job(s), ${matched} matched "${eventName}", ${
        apply ? `removed ${removed}` : "removed 0 (dry run)"
      }`
    )
    logger.info(`  job counts after: ${JSON.stringify(await queue.getJobCounts())}`)

    if (!apply && matched > 0) {
      logger.info(`  Re-run with "apply" to remove them.`)
    }
  } finally {
    await queue.close()
    await connection.quit()
  }
}
