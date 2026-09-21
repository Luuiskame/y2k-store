import { MedusaRequest } from "@medusajs/framework/http"

import {
  AUTH_LIMIT,
  RateLimitResult,
  STORE_LIMIT,
  bucketForIp,
  clientIp,
  consumeRateLimit,
  identifyClient,
  isInternalRequest,
  limitFor,
} from "../rate-limit"

const SECRET = "a".repeat(48)

type FakeRequest = {
  headers?: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
  cache?: { get: jest.Mock; set: jest.Mock }
}

/**
 * The helpers under test only ever touch `headers`, `socket` and `scope`, so a
 * plain object is enough — building a real MedusaRequest would drag in the
 * whole container for no extra coverage.
 */
const req = ({ headers = {}, socket, cache }: FakeRequest = {}) =>
  ({
    headers,
    socket,
    scope: { resolve: () => cache },
  }) as unknown as MedusaRequest

const memoryCache = () => {
  const store = new Map<string, number>()
  return {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: number) => {
      store.set(key, value)
    }),
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
  })
})

describe("consumeRateLimit", () => {
  it("lets exactly `limit` through and then blocks", async () => {
    const cache = memoryCache()
    const request = req({ cache })

    const results: RateLimitResult[] = []
    for (let i = 0; i < 5; i++) {
      results.push(await consumeRateLimit(request, "store:ip:1.2.3.4", 3, 60))
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
    const cache = memoryCache()
    const request = req({ cache })

    await consumeRateLimit(request, "store:ip:1.2.3.4", 1, 60)

    expect(
      (await consumeRateLimit(request, "store:ip:1.2.3.4", 1, 60)).allowed
    ).toBe(false)
    expect(
      (await consumeRateLimit(request, "auth:ip:1.2.3.4", 1, 60)).allowed
    ).toBe(true)
  })

  it("fails open when the cache throws", async () => {
    const cache = {
      get: jest.fn(async () => {
        throw new Error("redis down")
      }),
      set: jest.fn(),
    }
    const request = req({ cache })

    for (let i = 0; i < 20; i++) {
      const result = await consumeRateLimit(request, "store:ip:1.2.3.4", 1, 60)
      expect(result.allowed).toBe(true)
    }
    expect(cache.set).not.toHaveBeenCalled()
  })

  it("fails open when the cache hangs instead of throwing", async () => {
    // What a Redis outage actually looks like: ioredis queues the command while
    // it reconnects, so the call neither resolves nor rejects for ~84s.
    const cache = {
      get: jest.fn(() => new Promise(() => {})),
      set: jest.fn(() => new Promise(() => {})),
    }

    const started = Date.now()
    const result = await consumeRateLimit(
      req({ cache: cache as any }),
      "store:ip:1.2.3.4",
      1,
      60
    )

    expect(result.allowed).toBe(true)
    expect(Date.now() - started).toBeLessThan(2000)
  })

  it("still serves the request when only writing to the cache throws", async () => {
    const cache = {
      get: jest.fn(async () => 0),
      set: jest.fn(async () => {
        throw new Error("redis down")
      }),
    }

    await expect(
      consumeRateLimit(req({ cache }), "store:ip:1.2.3.4", 5, 60)
    ).resolves.toEqual({ allowed: true, remaining: 4, retryAfter: 0 })
  })
})
