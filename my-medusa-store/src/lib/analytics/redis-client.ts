import Redis from "ioredis"

/**
 * The handful of Redis operations the traffic counters use, queued and sent as
 * one pipeline by `exec()`, which resolves to the replies in order.
 *
 * An interface rather than ioredis directly so that local development without
 * `REDIS_URL` and the unit tests can run on the in-memory twin below, the same
 * split `counter.ts` makes for the rate limiter.
 */
export interface TrafficBatch {
  hsetnx(key: string, field: string, value: string): TrafficBatch
  hset(key: string, values: Record<string, string>): TrafficBatch
  hincrby(key: string, field: string, by: number): TrafficBatch
  /**
   * HINCRBY that stops adding fields once the hash holds `cap` of them: a new
   * field past the cap is counted under `overflow` instead. Existing fields
   * keep counting. This is what keeps a hash keyed on visitor-supplied paths
   * from growing without bound.
   */
  hincrcap(key: string, field: string, cap: number, overflow: string): TrafficBatch
  hgetall(key: string): TrafficBatch
  exists(key: string): TrafficBatch
  expire(key: string, seconds: number): TrafficBatch
  pfadd(key: string, member: string): TrafficBatch
  pfcount(keys: string[]): TrafficBatch
  zadd(key: string, score: number, member: string): TrafficBatch
  zrem(key: string, member: string): TrafficBatch
  zcard(key: string): TrafficBatch
  /** Members scored at or above `min`. */
  zcount(key: string, min: number): TrafficBatch
  /** Drops members scored at or below `max`. */
  zremrangebyscore(key: string, max: number): TrafficBatch
  /** Members scored at or above `min`, highest first, as `[member, score]`. */
  zrecent(key: string, min: number, limit: number): TrafficBatch
  exec(): Promise<unknown[]>
}

export interface TrafficClient {
  batch(): TrafficBatch
}

const CAPPED_HINCRBY = `
if redis.call("HEXISTS", KEYS[1], ARGV[1]) == 0 and redis.call("HLEN", KEYS[1]) >= tonumber(ARGV[2]) then
  return redis.call("HINCRBY", KEYS[1], ARGV[3], 1)
end
return redis.call("HINCRBY", KEYS[1], ARGV[1], 1)
`

const toPairs = (raw: unknown): [string, number][] => {
  const flat = Array.isArray(raw) ? (raw as string[]) : []
  const pairs: [string, number][] = []
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pairs.push([flat[i], Number(flat[i + 1])])
  }
  return pairs
}

const identity = (raw: unknown) => raw

class RedisBatch implements TrafficBatch {
  private readonly pipeline: any
  private readonly transforms: ((raw: unknown) => unknown)[] = []

  constructor(client: Redis) {
    this.pipeline = client.pipeline()
  }

  private queued(transform: (raw: unknown) => unknown = identity): this {
    this.transforms.push(transform)
    return this
  }

  hsetnx(key: string, field: string, value: string) {
    this.pipeline.hsetnx(key, field, value)
    return this.queued()
  }

  hset(key: string, values: Record<string, string>) {
    this.pipeline.hset(key, values)
    return this.queued()
  }

  hincrby(key: string, field: string, by: number) {
    this.pipeline.hincrby(key, field, by)
    return this.queued()
  }

  hincrcap(key: string, field: string, cap: number, overflow: string) {
    this.pipeline.hincrcap(key, field, String(cap), overflow)
    return this.queued()
  }

  hgetall(key: string) {
    this.pipeline.hgetall(key)
    return this.queued()
  }

  exists(key: string) {
    this.pipeline.exists(key)
    return this.queued((raw) => Number(raw) > 0)
  }

  expire(key: string, seconds: number) {
    this.pipeline.expire(key, seconds)
    return this.queued()
  }

  pfadd(key: string, member: string) {
    this.pipeline.pfadd(key, member)
    return this.queued()
  }

  pfcount(keys: string[]) {
    if (keys.length === 0) {
      // PFCOUNT with no key is a syntax error; answer zero without asking.
      this.pipeline.echo("0")
    } else {
      this.pipeline.pfcount(...keys)
    }
    return this.queued((raw) => Number(raw))
  }

  zadd(key: string, score: number, member: string) {
    this.pipeline.zadd(key, score, member)
    return this.queued()
  }

  zrem(key: string, member: string) {
    this.pipeline.zrem(key, member)
    return this.queued()
  }

  zcard(key: string) {
    this.pipeline.zcard(key)
    return this.queued((raw) => Number(raw))
  }

  zcount(key: string, min: number) {
    this.pipeline.zcount(key, min, "+inf")
    return this.queued((raw) => Number(raw))
  }

  zremrangebyscore(key: string, max: number) {
    this.pipeline.zremrangebyscore(key, "-inf", max)
    return this.queued()
  }

  zrecent(key: string, min: number, limit: number) {
    this.pipeline.zrevrangebyscore(key, "+inf", min, "WITHSCORES", "LIMIT", 0, limit)
    return this.queued(toPairs)
  }

  async exec(): Promise<unknown[]> {
    const replies: [Error | null, unknown][] = (await this.pipeline.exec()) ?? []
    return replies.map(([error, reply], i) => {
      if (error) {
        throw error
      }
      return this.transforms[i](reply)
    })
  }
}

/**
 * One error line every 10 s at most: during an outage every beacon fails, and
 * the store is only a dashboard, so the log only needs to say that it is down.
 */
let lastConnectionErrorLog = 0

export const redisTrafficClient = (url: string): TrafficClient => {
  // Its own connection, like the rate limiter's (see counter.ts): a slow
  // dashboard read must never queue behind, or in front of, the commands that
  // keep checkout rate limited.
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
  })

  client.defineCommand("hincrcap", { numberOfKeys: 1, lua: CAPPED_HINCRBY })

  client.on("error", (error) => {
    const now = Date.now()
    if (now - lastConnectionErrorLog < 10_000) {
      return
    }
    lastConnectionErrorLog = now
    console.warn(`[analytics] redis connection error: ${error.message}`)
  })

  return { batch: () => new RedisBatch(client) }
}

type Stored =
  | { kind: "hash"; value: Map<string, string> }
  | { kind: "zset"; value: Map<string, number> }
  | { kind: "hll"; value: Set<string> }

/**
 * Single-process stand-in for local development without Redis, and for tests.
 * Same replies as Redis for everything the traffic store does; HyperLogLog is
 * an exact set, which only makes it more precise than the real thing.
 */
export const memoryTrafficClient = (
  now: () => number = Date.now
): TrafficClient => {
  const data = new Map<string, Stored>()
  const expiry = new Map<string, number>()

  const alive = (key: string): Stored | undefined => {
    const at = expiry.get(key)
    if (at !== undefined && at <= now()) {
      data.delete(key)
      expiry.delete(key)
    }
    return data.get(key)
  }

  const hash = (key: string, create: boolean): Map<string, string> | null => {
    const stored = alive(key)
    if (stored?.kind === "hash") {
      return stored.value
    }
    if (!create) {
      return null
    }
    const value = new Map<string, string>()
    data.set(key, { kind: "hash", value })
    return value
  }

  const zset = (key: string, create: boolean): Map<string, number> | null => {
    const stored = alive(key)
    if (stored?.kind === "zset") {
      return stored.value
    }
    if (!create) {
      return null
    }
    const value = new Map<string, number>()
    data.set(key, { kind: "zset", value })
    return value
  }

  const hincr = (key: string, field: string, by: number): number => {
    const h = hash(key, true)!
    const next = Number(h.get(field) ?? 0) + by
    h.set(field, String(next))
    return next
  }

  return {
    batch() {
      const ops: (() => unknown)[] = []
      const batch: TrafficBatch = {
        hsetnx(key, field, value) {
          ops.push(() => {
            const h = hash(key, true)!
            if (h.has(field)) {
              return 0
            }
            h.set(field, value)
            return 1
          })
          return batch
        },
        hset(key, values) {
          ops.push(() => {
            const h = hash(key, true)!
            let added = 0
            for (const [field, value] of Object.entries(values)) {
              added += h.has(field) ? 0 : 1
              h.set(field, value)
            }
            return added
          })
          return batch
        },
        hincrby(key, field, by) {
          ops.push(() => hincr(key, field, by))
          return batch
        },
        hincrcap(key, field, cap, overflow) {
          ops.push(() => {
            const h = hash(key, false)
            const full = h ? !h.has(field) && h.size >= cap : false
            return hincr(key, full ? overflow : field, 1)
          })
          return batch
        },
        hgetall(key) {
          ops.push(() => Object.fromEntries(hash(key, false) ?? []))
          return batch
        },
        exists(key) {
          ops.push(() => alive(key) !== undefined)
          return batch
        },
        expire(key, seconds) {
          ops.push(() => {
            if (!alive(key)) {
              return 0
            }
            expiry.set(key, now() + seconds * 1000)
            return 1
          })
          return batch
        },
        pfadd(key, member) {
          ops.push(() => {
            let stored = alive(key)
            if (stored?.kind !== "hll") {
              stored = { kind: "hll", value: new Set() }
              data.set(key, stored)
            }
            const before = stored.value.size
            stored.value.add(member)
            return stored.value.size > before ? 1 : 0
          })
          return batch
        },
        pfcount(keys) {
          ops.push(() => {
            const union = new Set<string>()
            for (const key of keys) {
              const stored = alive(key)
              if (stored?.kind === "hll") {
                stored.value.forEach((m) => union.add(m))
              }
            }
            return union.size
          })
          return batch
        },
        zadd(key, score, member) {
          ops.push(() => {
            const z = zset(key, true)!
            const added = z.has(member) ? 0 : 1
            z.set(member, score)
            return added
          })
          return batch
        },
        zrem(key, member) {
          ops.push(() => (zset(key, false)?.delete(member) ? 1 : 0))
          return batch
        },
        zcard(key) {
          ops.push(() => zset(key, false)?.size ?? 0)
          return batch
        },
        zcount(key, min) {
          ops.push(() =>
            [...(zset(key, false)?.values() ?? [])].filter((s) => s >= min).length
          )
          return batch
        },
        zremrangebyscore(key, max) {
          ops.push(() => {
            const z = zset(key, false)
            let removed = 0
            for (const [member, score] of z ?? []) {
              if (score <= max) {
                z!.delete(member)
                removed++
              }
            }
            return removed
          })
          return batch
        },
        zrecent(key, min, limit) {
          ops.push(() =>
            [...(zset(key, false) ?? [])]
              .filter(([, score]) => score >= min)
              .sort((a, b) => b[1] - a[1])
              .slice(0, limit)
          )
          return batch
        },
        async exec() {
          return ops.map((op) => op())
        },
      }
      return batch
    },
  }
}
