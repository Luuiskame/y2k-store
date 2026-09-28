import Redis from "ioredis"

/**
 * A counter that increments and reads back in a single step.
 *
 * This is what the rate limiter stands on, and the single step is the whole
 * point. The limiter used to read the count through the Cache Module, compare,
 * and write `count + 1` back: two round trips with a gap in between, so two
 * requests landing in that gap read the same count and one increment was lost.
 * Every measurement so far was strictly sequential, which is why nobody saw it;
 * a flood is concurrent by definition.
 */
export type Counter = {
  /**
   * Adds one to `key` and returns the new value. The key expires `ttlSeconds`
   * after it is first created, so a window's counter cleans itself up.
   */
  increment(key: string, ttlSeconds: number): Promise<number>
}

/**
 * INCR and EXPIRE inside one script, which Redis runs atomically: no other
 * command can land between them, so a key can never be left without a TTL.
 * The TTL check (rather than `count == 1`) also heals a key that somehow ended
 * up without one instead of letting it count forever.
 */
const INCREMENT_WITH_TTL = `
local count = redis.call("INCR", KEYS[1])
if redis.call("TTL", KEYS[1]) == -1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`

type EvalClient = Pick<Redis, "eval">

export const redisCounter = (client: EvalClient): Counter => ({
  async increment(key, ttlSeconds) {
    const count = await client.eval(
      INCREMENT_WITH_TTL,
      1,
      key,
      String(Math.max(1, Math.ceil(ttlSeconds)))
    )
    return Number(count)
  },
})

/** Past this many live keys, expired ones are swept before adding another. */
const MEMORY_SWEEP_THRESHOLD = 10_000

/**
 * Single-process counter for local development without `REDIS_URL`.
 *
 * Atomic for the same reason Node is single-threaded: the read and the write
 * happen in one synchronous block, with no `await` for another request to slip
 * into. It is per process, so it must never be what production runs on — with
 * more than one process each would hold its own count.
 */
export const memoryCounter = (now: () => number = Date.now): Counter => {
  const entries = new Map<string, { count: number; expiresAt: number }>()

  const sweep = (at: number) => {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= at) {
        entries.delete(key)
      }
    }
  }

  return {
    async increment(key, ttlSeconds) {
      const at = now()
      const entry = entries.get(key)

      if (entry && entry.expiresAt > at) {
        entry.count += 1
        return entry.count
      }

      if (entries.size >= MEMORY_SWEEP_THRESHOLD) {
        sweep(at)
      }

      entries.set(key, { count: 1, expiresAt: at + ttlSeconds * 1000 })
      return 1
    },
  }
}

/**
 * A Redis error during an outage fires on every reconnect attempt. The limiter
 * already logs each request it lets through uncounted, so one line every 10s
 * here is enough to say why.
 */
let lastConnectionErrorLog = 0

const createClient = (url: string): Redis => {
  const client = new Redis(url, {
    // Fail a command after one reconnect attempt rather than holding it for
    // the ~84s ioredis would otherwise wait. The limiter has its own deadline
    // on top, so a request never waits on this, but a dead Redis should not
    // accumulate a queue of pending commands either.
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
  })

  client.on("error", (error) => {
    const now = Date.now()
    if (now - lastConnectionErrorLog < 10_000) {
      return
    }
    lastConnectionErrorLog = now
    console.warn(`[counter] redis connection error: ${error.message}`)
  })

  return client
}

let shared: Counter | undefined

/**
 * The counter the rate limiters use: Redis when `REDIS_URL` is set, so every
 * server instance shares one count, and the in-process fallback otherwise.
 *
 * It opens its own connection instead of going through the Cache Module
 * because that module only exposes `get`/`set` — no `INCR` — which is exactly
 * the gap that made the old counter lose increments. The connection is created
 * on first use so that importing this file (tests, the worker) costs nothing.
 */
export const sharedCounter = (): Counter => {
  if (!shared) {
    const url = process.env.REDIS_URL
    shared = url ? redisCounter(createClient(url)) : memoryCounter()
  }

  return shared
}
