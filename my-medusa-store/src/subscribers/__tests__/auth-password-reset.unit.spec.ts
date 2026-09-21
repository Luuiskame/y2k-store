import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import authPasswordResetHandler from "../auth-password-reset"

/**
 * The handler only ever resolves four things out of the container, so a plain
 * object is enough — standing up a real Medusa container would drag in the
 * whole framework for no extra coverage. Same approach as
 * `src/lib/__tests__/rate-limit.unit.spec.ts`.
 */
const memoryCache = () => {
  const store = new Map<string, unknown>()
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value)
    }),
  }
}

const buildContainer = (overrides: { cache?: any; notification?: any } = {}) => {
  const cache = overrides.cache ?? memoryCache()
  const notification = overrides.notification ?? {
    createNotifications: jest.fn(async () => undefined),
  }
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
  const query = {
    graph: jest.fn(async () => ({ data: [{ first_name: "Ada" }] })),
  }

  return {
    cache,
    notification,
    logger,
    query,
    container: {
      resolve: (key: string) => {
        if (key === Modules.CACHE) return cache
        if (key === Modules.NOTIFICATION) return notification
        if (key === ContainerRegistrationKeys.LOGGER) return logger
        if (key === ContainerRegistrationKeys.QUERY) return query
        throw new Error(`unexpected container key: ${key}`)
      },
    },
  }
}

const run = (
  deps: ReturnType<typeof buildContainer>,
  data: Partial<{ entity_id: string; actor_type: string; token: string }> = {}
) =>
  authPasswordResetHandler({
    event: {
      data: {
        entity_id: "ada@example.com",
        actor_type: "customer",
        token: "tok_123",
        ...data,
      },
    },
    container: deps.container,
  } as any)

const budgetKey = () =>
  `auth-reset-email-budget:${new Date().toISOString().slice(0, 10)}`

describe("auth-password-reset", () => {
  it("sends, then charges the budget and arms the dedupe", async () => {
    const deps = buildContainer()

    await run(deps)

    expect(deps.notification.createNotifications).toHaveBeenCalledTimes(1)
    expect(deps.cache.store.get(budgetKey())).toBe(1)
    expect(
      [...deps.cache.store.keys()].some((k) =>
        k.startsWith("auth-reset-notified:")
      )
    ).toBe(true)
  })

  it("does not put the raw address in the cache key", async () => {
    const deps = buildContainer()

    await run(deps)

    expect(
      [...deps.cache.store.keys()].join(" ")
    ).not.toContain("ada@example.com")
  })

  it("sends only once per address inside the dedupe window", async () => {
    const deps = buildContainer()

    await run(deps)
    await run(deps)
    await run(deps)

    expect(deps.notification.createNotifications).toHaveBeenCalledTimes(1)
    expect(deps.cache.store.get(budgetKey())).toBe(1)
  })

  it("still sends to a different address", async () => {
    const deps = buildContainer()

    await run(deps, { entity_id: "ada@example.com" })
    await run(deps, { entity_id: "grace@example.com" })

    expect(deps.notification.createNotifications).toHaveBeenCalledTimes(2)
    expect(deps.cache.store.get(budgetKey())).toBe(2)
  })

  it("treats the address case-insensitively", async () => {
    const deps = buildContainer()

    await run(deps, { entity_id: "ada@example.com" })
    await run(deps, { entity_id: "  ADA@Example.com " })

    expect(deps.notification.createNotifications).toHaveBeenCalledTimes(1)
  })

  it("stops sending once the daily budget is exhausted", async () => {
    const deps = buildContainer()
    deps.cache.store.set(budgetKey(), 20)

    await run(deps)

    expect(deps.notification.createNotifications).not.toHaveBeenCalled()
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("daily reset-email budget")
    )
  })

  it("caps a flood of rotating addresses at the daily budget", async () => {
    const deps = buildContainer()

    for (let i = 0; i < 50; i++) {
      await run(deps, { entity_id: `victim${i}@example.com` })
    }

    expect(deps.notification.createNotifications).toHaveBeenCalledTimes(20)
    expect(deps.cache.store.get(budgetKey())).toBe(20)
  })

  it("does not charge the budget when the send fails", async () => {
    const deps = buildContainer({
      notification: {
        createNotifications: jest.fn(async () => {
          throw new Error("resend: daily quota exceeded")
        }),
      },
    })

    await run(deps)

    expect(deps.cache.store.get(budgetKey())).toBeUndefined()
    expect(
      [...deps.cache.store.keys()].some((k) =>
        k.startsWith("auth-reset-notified:")
      )
    ).toBe(false)
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("failed to send reset email")
    )
  })

  it("fails open when the cache is unavailable", async () => {
    // Locking real customers out of their own account is worse than one day of
    // uncapped mail.
    const deps = buildContainer({
      cache: {
        store: new Map(),
        get: jest.fn(async () => {
          throw new Error("redis down")
        }),
        set: jest.fn(async () => {
          throw new Error("redis down")
        }),
      },
    })

    await run(deps)

    expect(deps.notification.createNotifications).toHaveBeenCalledTimes(1)
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("could not record email budget")
    )
  })

  it("ignores admin resets and malformed payloads without touching the cache", async () => {
    const deps = buildContainer()

    await run(deps, { actor_type: "user" })
    await run(deps, { entity_id: "" })
    await run(deps, { token: "" })

    expect(deps.notification.createNotifications).not.toHaveBeenCalled()
    expect(deps.cache.get).not.toHaveBeenCalled()
  })

  it("does not query the database for a request it will skip", async () => {
    const deps = buildContainer()
    deps.cache.store.set(budgetKey(), 20)

    await run(deps)

    expect(deps.query.graph).not.toHaveBeenCalled()
  })
})
