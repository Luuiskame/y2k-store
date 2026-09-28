import { MedusaRequest } from "@medusajs/framework/http"

import { Counter, memoryCounter, redisCounter } from "../counter"
import {
  ADMIN_LIMIT,
  AUTH_LIMIT,
  RateLimitResult,
  STORE_LIMIT,
  authIdentifier,
  bucketForIp,
  clientIp,
  consumeRateLimit,
  identifierBucket,
  identifyClient,
  isInternalRequest,
  limitFor,
} from "../rate-limit"

const SECRET = "a".repeat(48)

type FakeRequest = {
  headers?: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
}

/**
 * The helpers under test only ever touch `headers` and `socket`, so a plain
 * object is enough — building a real MedusaRequest would drag in the whole
 * container for no extra coverage.
 */
const req = ({ headers = {}, socket }: FakeRequest = {}) =>
  ({
    headers,
    socket,
  }) as unknown as MedusaRequest

/**
 * Atomic like the real ones, but each increment yields to the event loop for a
 * random moment first, so concurrent callers genuinely interleave. That is the
 * situation the old get → compare → set lost increments in.
 */
const interleavingCounter = (): Counter => {
  const inner = memoryCounter()
  return {
    increment: async (key, ttlSeconds) => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 5))
      return inner.increment(key, ttlSeconds)
    },
  }
}

const withEnv = async (env: Record<string, string | undefined>, fn: () => void) => {
  const previous: Record<string, string | undefined> = {}

  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    await fn()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

beforeEach(() => {
  delete process.env.STOREFRONT_SHARED_SECRET
  delete process.env.CLIENT_IP_SOURCE
  delete process.env.TRUSTED_PROXY_HOPS
})

describe("isInternalRequest", () => {
  it("is false when STOREFRONT_SHARED_SECRET is not configured", () => {
    expect(
      isInternalRequest(req({ headers: { "x-storefront-secret": SECRET } }))
    ).toBe(false)
  })

  it("is true only for the exact secret", () =>
    withEnv({ STOREFRONT_SHARED_SECRET: SECRET }, () => {
      expect(
        isInternalRequest(req({ headers: { "x-storefront-secret": SECRET } }))
      ).toBe(true)
      expect(
        isInternalRequest(
          req({ headers: { "x-storefront-secret": "b".repeat(48) } })
        )
      ).toBe(false)
    }))

  it("does not throw on a secret of a different length", () =>
    withEnv({ STOREFRONT_SHARED_SECRET: SECRET }, () => {
      expect(() =>
        isInternalRequest(req({ headers: { "x-storefront-secret": "short" } }))
      ).not.toThrow()
      expect(
        isInternalRequest(req({ headers: { "x-storefront-secret": "short" } }))
      ).toBe(false)
      expect(
        isInternalRequest(
          req({ headers: { "x-storefront-secret": SECRET + "extra" } })
        )
      ).toBe(false)
    }))

  it("is false when the header is missing entirely", () =>
    withEnv({ STOREFRONT_SHARED_SECRET: SECRET }, () => {
      expect(isInternalRequest(req())).toBe(false)
    }))
})

describe("clientIp", () => {
  it("reads x-forwarded-for two entries from the right, Railway's shape", () => {
    // 203.0.113.9 is the internal hop's own address, 2.2.2.2 is what the edge
    // saw the caller connect from, 1.1.1.1 is whatever the caller sent.
    expect(
      clientIp(
        req({
          headers: {
            "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.9",
          },
        })
      )
    ).toBe("2.2.2.2")
  })

  it("honours TRUSTED_PROXY_HOPS over the default", () => {
    const headers = {
      "x-forwarded-for": "1.1.1.1, 198.51.100.4, 203.0.113.9",
    }

    withEnv({ TRUSTED_PROXY_HOPS: "1" }, () => {
      expect(clientIp(req({ headers }))).toBe("203.0.113.9")
    })
    withEnv({ TRUSTED_PROXY_HOPS: "3" }, () => {
      expect(clientIp(req({ headers }))).toBe("1.1.1.1")
    })
  })

  it("ignores x-real-client-ip without a valid secret", () => {
    // No secret configured at all.
    expect(
      clientIp(
        req({
          headers: {
            "x-real-client-ip": "198.51.100.77",
            "x-forwarded-for": "203.0.113.9",
          },
        })
      )
    ).toBe("203.0.113.9")

    // Secret configured, but the caller presents the wrong one.
    return withEnv({ STOREFRONT_SHARED_SECRET: SECRET }, () => {
      expect(
        clientIp(
          req({
            headers: {
              "x-storefront-secret": "b".repeat(48),
              "x-real-client-ip": "198.51.100.77",
              "x-forwarded-for": "203.0.113.9",
            },
          })
        )
      ).toBe("203.0.113.9")
    })
  })

  it("uses x-real-client-ip when the secret is valid", () =>
    withEnv({ STOREFRONT_SHARED_SECRET: SECRET }, () => {
      expect(
        clientIp(
          req({
            headers: {
              "x-storefront-secret": SECRET,
              "x-real-client-ip": "198.51.100.77",
              "x-forwarded-for": "203.0.113.9",
            },
          })
        )
      ).toBe("198.51.100.77")
    }))

  it("uses cf-connecting-ip when CLIENT_IP_SOURCE=cf", () =>
    withEnv({ CLIENT_IP_SOURCE: "cf" }, () => {
      expect(
        clientIp(
          req({
            headers: {
              // An attacker padding x-forwarded-for behind Cloudflare must not win.
              "x-forwarded-for": "6.6.6.6, 7.7.7.7",
              "cf-connecting-ip": "198.51.100.23",
            },
          })
        )
      ).toBe("198.51.100.23")
    }))

  it("falls back to the socket address when no header is present", () => {
    expect(clientIp(req({ socket: { remoteAddress: "10.0.0.5" } }))).toBe(
      "10.0.0.5"
    )
  })

  it("returns 'unknown' for junk", () => {
    expect(
      clientIp(req({ headers: { "x-forwarded-for": "not-an-ip" } }))
    ).toBe("unknown")
    expect(
      clientIp(
        req({
          headers: { "x-forwarded-for": "evil:key:injection" },
          socket: { remoteAddress: "also-junk" },
        })
      )
    ).toBe("unknown")
    expect(clientIp(req())).toBe("unknown")
  })

  /**
   * The production bug of 2026-09-21, and the reason the first attempt at
   * fixing it did not work.
   *
   * Railway's internal hop appends its OWN address, and it is publicly routable
   * and comes from a small pool: 152.233.23.193 and 152.233.23.194 alternating
   * per request. Reading the rightmost non-private entry therefore bucketed one
   * caller under two different keys — effective limit exactly 2x — and bucketed
   * every caller in the world under one of those same two keys.
   *
   * The position from the right is what has to be right. The addresses at that
   * position are irrelevant, public or private.
   */
  it("resolves one caller to one bucket across Railway's alternating edges", () => {
    const shapes = [
      "206.203.54.52, 152.233.23.193",
      "206.203.54.52, 152.233.23.194",
    ]

    for (const xff of shapes) {
      expect(clientIp(req({ headers: { "x-forwarded-for": xff } }))).toBe(
        "206.203.54.52"
      )
    }
  })

  it("clamps to the leftmost entry when the chain is shorter than configured", () => {
    expect(
      clientIp(req({ headers: { "x-forwarded-for": "203.0.113.9" } }))
    ).toBe("203.0.113.9")
  })

  it("does not split one caller between the header and the socket fallback", () => {
    // Node reports an IPv4 peer as IPv4-mapped IPv6 on a dual-stack listener.
    expect(
      clientIp(req({ socket: { remoteAddress: "::ffff:203.0.113.9" } }))
    ).toBe("203.0.113.9")
    expect(
      clientIp(req({ headers: { "x-forwarded-for": "203.0.113.9" } }))
    ).toBe("203.0.113.9")
  })

  it("still refuses an address the client padded the list with", () => {
    // The caller sent "6.6.6.6"; the edge appended the address it actually saw,
    // and the internal hop appended the edge's. An extra entry on the left
    // shifts the whole list, and the position we read shifts with it.
    expect(
      clientIp(
        req({
          headers: {
            "x-forwarded-for": "6.6.6.6, 203.0.113.9, 192.0.2.50",
          },
        })
      )
    ).toBe("203.0.113.9")
  })

  it("falls back to the socket rather than guess when the entry is junk", () => {
    expect(
      clientIp(
        req({
          headers: { "x-forwarded-for": "not-an-ip, 203.0.113.9" },
          socket: { remoteAddress: "::ffff:100.64.0.7" },
        })
      )
    ).toBe("100.64.0.7")
  })

  it("strips an IPv6 zone index", () => {
    expect(
      clientIp(req({ headers: { "x-forwarded-for": "2001:db8::1%eth0" } }))
    ).toBe("2001:db8::1")
  })

  it("normalises a port suffix and IPv6 brackets", () => {
    expect(
      clientIp(req({ headers: { "x-forwarded-for": "203.0.113.9:54321" } }))
    ).toBe("203.0.113.9")
    expect(
      clientIp(req({ headers: { "x-forwarded-for": "[2001:db8::1]:443" } }))
    ).toBe("2001:db8::1")
  })
})

describe("bucketForIp", () => {
  it("buckets IPv4 as itself", () => {
    expect(bucketForIp("203.0.113.9")).toBe("203.0.113.9")
  })

  /**
   * An ISP hands a single subscriber a whole /64. Bucketing the full address
   * gives that one customer 2^64 buckets, i.e. no limit at all.
   */
  it("collapses every address in one IPv6 /64 into a single bucket", () => {
    const bucket = bucketForIp("2001:db8:85a3:1::1")

    expect(bucketForIp("2001:db8:85a3:1::2")).toBe(bucket)
    expect(bucketForIp("2001:db8:85a3:1:ffff:ffff:ffff:ffff")).toBe(bucket)
    expect(bucketForIp("2001:0db8:85a3:0001::1")).toBe(bucket)
  })

  it("keeps a different /64 in a different bucket", () => {
    expect(bucketForIp("2001:db8:85a3:2::1")).not.toBe(
      bucketForIp("2001:db8:85a3:1::1")
    )
  })

  it("handles the fully written form and a trailing IPv4 literal", () => {
    expect(bucketForIp("2001:0db8:0000:0000:0000:0000:0000:0001")).toBe(
      bucketForIp("2001:db8::1")
    )
    expect(bucketForIp("2001:db8::203.0.113.9")).toBe(bucketForIp("2001:db8::1"))
  })
})

describe("identifyClient / limitFor", () => {
  it("gives storefront traffic with a real address the per-visitor limit", () =>
    withEnv({ STOREFRONT_SHARED_SECRET: SECRET }, () => {
      const identity = identifyClient(
        req({
          headers: {
            "x-storefront-secret": SECRET,
            "x-real-client-ip": "198.51.100.77",
          },
        })
      )

      expect(identity).toEqual({
        ip: "198.51.100.77",
        bucket: "198.51.100.77",
        internal: true,
        realIp: true,
      })
      expect(limitFor(STORE_LIMIT, identity)).toBe(120)
      expect(limitFor(AUTH_LIMIT, identity)).toBe(10)
    }))

  it("gives storefront traffic with no visitor address the shared safety net", () =>
    withEnv({ STOREFRONT_SHARED_SECRET: SECRET }, () => {
      const identity = identifyClient(
        req({
          headers: {
            "x-storefront-secret": SECRET,
            "x-forwarded-for": "203.0.113.9",
          },
        })
      )

      expect(identity).toEqual({
        ip: "203.0.113.9",
        bucket: "203.0.113.9",
        internal: true,
        realIp: false,
      })
      expect(limitFor(STORE_LIMIT, identity)).toBe(1200)
      expect(limitFor(AUTH_LIMIT, identity)).toBe(100)
    }))

  it("gives everything else the external limit", () => {
    const identity = identifyClient(
      req({ headers: { "x-forwarded-for": "203.0.113.9" } })
    )

    expect(identity).toEqual({
      ip: "203.0.113.9",
      bucket: "203.0.113.9",
      internal: false,
      realIp: false,
    })
    expect(limitFor(STORE_LIMIT, identity)).toBe(60)
    expect(limitFor(AUTH_LIMIT, identity)).toBe(10)
    // The admin dashboard is always external: the owner's browser, not Vercel.
    expect(limitFor(ADMIN_LIMIT, identity)).toBe(300)
  })
})

describe("consumeRateLimit", () => {
  it("lets exactly `limit` through and then blocks", async () => {
    const counter = memoryCounter()

    const results: RateLimitResult[] = []
    for (let i = 0; i < 5; i++) {
      results.push(await consumeRateLimit("store:ip:1.2.3.4", 3, 60, counter))
    }

    expect(results.map((r) => r.allowed)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ])
    expect(results.slice(0, 3).map((r) => r.remaining)).toEqual([2, 1, 0])
    expect(results[3].retryAfter).toBeGreaterThan(0)
    expect(results[3].retryAfter).toBeLessThanOrEqual(60)
  })

  it("keeps separate keys in separate buckets", async () => {
    const counter = memoryCounter()

    await consumeRateLimit("store:ip:1.2.3.4", 1, 60, counter)

    expect(
      (await consumeRateLimit("store:ip:1.2.3.4", 1, 60, counter)).allowed
    ).toBe(false)
    expect(
      (await consumeRateLimit("auth:ip:1.2.3.4", 1, 60, counter)).allowed
    ).toBe(true)
  })

  /**
   * Why the counter moved to INCR. Every measurement against production was
   * strictly sequential; a flood is not. With get → compare → set, requests
   * landing in the gap between the read and the write all read the same count,
   * and the effective limit grew with the concurrency.
   */
  it("lets exactly `limit` through when the requests arrive concurrently", async () => {
    const counter = interleavingCounter()

    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        consumeRateLimit("auth:ip:1.2.3.4", 10, 60, counter)
      )
    )

    expect(results.filter((r) => r.allowed)).toHaveLength(10)
    expect(
      results
        .filter((r) => r.allowed)
        .map((r) => r.remaining)
        .sort((a, b) => a - b)
    ).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("fails open when the counter throws", async () => {
    const counter = {
      increment: jest.fn(async () => {
        throw new Error("redis down")
      }),
    }

    for (let i = 0; i < 20; i++) {
      const result = await consumeRateLimit("store:ip:1.2.3.4", 1, 60, counter)
      expect(result.allowed).toBe(true)
    }
    expect(counter.increment).toHaveBeenCalledTimes(20)
  })

  it("fails open when the counter hangs instead of throwing", async () => {
    // What a Redis outage actually looks like: ioredis queues the command while
    // it reconnects, so the call neither resolves nor rejects for ~84s.
    const counter = { increment: jest.fn(() => new Promise<number>(() => {})) }

    const started = Date.now()
    const result = await consumeRateLimit("store:ip:1.2.3.4", 1, 60, counter)

    expect(result.allowed).toBe(true)
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it("counts each window under its own key, with the window as TTL", async () => {
    const counter = { increment: jest.fn(async () => 1) }

    await consumeRateLimit("auth:id:abc", 10, 900, counter)

    const window = Math.floor(Date.now() / 900_000)
    expect(counter.increment).toHaveBeenCalledWith(
      `ratelimit:auth:id:abc:${window}`,
      900
    )
  })
})

describe("memoryCounter", () => {
  it("counts per key and starts over once the key expires", async () => {
    let now = 1_000_000
    const counter = memoryCounter(() => now)

    expect(await counter.increment("a", 60)).toBe(1)
    expect(await counter.increment("a", 60)).toBe(2)
    expect(await counter.increment("b", 60)).toBe(1)

    now += 60_000
    expect(await counter.increment("a", 60)).toBe(1)
  })
})

describe("redisCounter", () => {
  it("increments and sets the TTL in one script, and returns a number", async () => {
    const client = { eval: jest.fn(async () => 7) }

    const count = await redisCounter(client as any).increment("k", 60)

    expect(count).toBe(7)
    expect(client.eval).toHaveBeenCalledTimes(1)

    const [script, keyCount, key, ttl] = (client.eval.mock.calls[0] as unknown) as [
      string,
      number,
      string,
      string
    ]
    expect(script).toContain('redis.call("INCR", KEYS[1])')
    expect(script).toContain('redis.call("EXPIRE", KEYS[1], ARGV[1])')
    expect([keyCount, key, ttl]).toEqual([1, "k", "60"])
  })

  it("never asks Redis for a TTL under one second", async () => {
    const client = { eval: jest.fn(async () => 1) }

    await redisCounter(client as any).increment("k", 0.2)

    expect((client.eval.mock.calls[0] as unknown[])[3]).toBe("1")
  })
})

describe("authIdentifier / identifierBucket", () => {
  it("reads `email`, or `identifier` for reset-password, normalised", () => {
    expect(authIdentifier({ email: "  Ada@Example.com ", password: "x" })).toBe(
      "ada@example.com"
    )
    expect(authIdentifier({ identifier: "GRACE@example.com" })).toBe(
      "grace@example.com"
    )
  })

  it("returns null when the body names no account", () => {
    expect(authIdentifier(undefined)).toBeNull()
    expect(authIdentifier("email=ada@example.com")).toBeNull()
    expect(authIdentifier({})).toBeNull()
    expect(authIdentifier({ email: "   " })).toBeNull()
    expect(authIdentifier({ email: ["ada@example.com"] })).toBeNull()
  })

  it("buckets one account under one hashed key, without the address in it", () => {
    const bucket = identifierBucket("ada@example.com")

    expect(bucket).toMatch(/^[0-9a-f]{32}$/)
    expect(bucket).not.toContain("ada")
    expect(identifierBucket(authIdentifier({ email: "ADA@example.com" })!)).toBe(
      bucket
    )
    expect(identifierBucket("grace@example.com")).not.toBe(bucket)
  })
})
