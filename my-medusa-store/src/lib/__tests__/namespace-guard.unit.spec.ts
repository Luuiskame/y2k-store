/**
 * `ApiLoader` itself is not needed here: the guard only reads and replaces its
 * static `traceMiddleware`, so a plain object stands in for the class, and the
 * hook is driven by hand the way `ApiLoader.load()` calls it.
 *
 * The module keeps per-process state (which namespaces got wrapped), so each
 * test loads a fresh copy.
 */
type GuardModule = typeof import("../namespace-guard")

const load = (): GuardModule => {
  let mod: GuardModule | undefined
  jest.isolateModules(() => {
    mod = require("../namespace-guard")
  })
  return mod!
}

const middleware = () => jest.fn((_req: any, _res: any, next: () => void) => next())

/** Runs middlewares in order the way Express would, stopping when one does not call next. */
const runChain = async (chain: any[], req: object, res: object = {}) => {
  let reached = 0
  for (const mw of chain) {
    let calledNext = false
    await mw(req, res, () => {
      calledNext = true
    })
    if (!calledNext) {
      break
    }
    reached++
  }
  return reached
}

describe("installNamespaceGuards", () => {
  it("hands back every other middleware untouched", () => {
    const { installNamespaceGuards, isNamespaceGuarded } = load()
    const loader: any = {}
    installNamespaceGuards(loader, { "/store": async () => false })

    const bodyParser = middleware()
    const routeMiddleware = middleware()
    const methodMiddleware = middleware()

    // Body parsers are registered under "/", project and core route
    // middlewares under their own matcher, method-bound ones with a method.
    expect(loader.traceMiddleware(bodyParser, { route: "/" })).toBe(bodyParser)
    expect(
      loader.traceMiddleware(routeMiddleware, { route: "/store/products" })
    ).toBe(routeMiddleware)
    expect(
      loader.traceMiddleware(methodMiddleware, { route: "/store", method: "GET" })
    ).toBe(methodMiddleware)
    expect(isNamespaceGuarded("/store")).toBe(false)
  })

  it("runs the guard once per request, ahead of every namespace middleware", async () => {
    const { installNamespaceGuards, isNamespaceGuarded, guardRanFor } = load()
    const loader: any = {}
    const guard = jest.fn(async () => false)
    installNamespaceGuards(loader, { "/store": guard })

    const cors = middleware()
    const publishableKey = middleware()
    const chain = [
      loader.traceMiddleware(cors, { route: "/store" }),
      loader.traceMiddleware(publishableKey, { route: "/store" }),
    ]

    const request = {}
    expect(await runChain(chain, request)).toBe(2)

    expect(guard).toHaveBeenCalledTimes(1)
    expect(cors).toHaveBeenCalledTimes(1)
    expect(publishableKey).toHaveBeenCalledTimes(1)
    expect(isNamespaceGuarded("/store")).toBe(true)
    expect(guardRanFor(request)).toBe(true)
    expect(guardRanFor({})).toBe(false)

    // A second request gets its own run of the guard.
    await runChain(chain, {})
    expect(guard).toHaveBeenCalledTimes(2)
  })

  it("stops the request before Medusa's middleware when the guard answers", async () => {
    const { installNamespaceGuards } = load()
    const loader: any = {}
    installNamespaceGuards(loader, { "/store": async () => true })

    const publishableKey = middleware()
    const chain = [loader.traceMiddleware(publishableKey, { route: "/store" })]

    expect(await runChain(chain, {})).toBe(0)
    expect(publishableKey).not.toHaveBeenCalled()
  })

  it("lets the request through when the guard throws", async () => {
    const { installNamespaceGuards } = load()
    const loader: any = {}
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})
    installNamespaceGuards(loader, {
      "/admin": async () => {
        throw new Error("boom")
      },
    })

    const auth = middleware()
    const chain = [loader.traceMiddleware(auth, { route: "/admin" })]

    expect(await runChain(chain, {})).toBe(1)
    expect(auth).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("/admin"))
    warn.mockRestore()
  })

  it("keeps a hook that was already installed, such as OpenTelemetry's", async () => {
    const { installNamespaceGuards } = load()
    const traced = jest.fn()
    const previous = jest.fn((handler: any) => {
      return (req: any, res: any, next: any) => {
        traced()
        return handler(req, res, next)
      }
    })
    const loader: any = { traceMiddleware: previous }
    installNamespaceGuards(loader, { "/store": async () => false })

    const bodyParser = middleware()
    const cors = middleware()
    await runChain([loader.traceMiddleware(bodyParser, { route: "/" })], {})
    await runChain([loader.traceMiddleware(cors, { route: "/store" })], {})

    expect(previous).toHaveBeenCalledTimes(2)
    expect(traced).toHaveBeenCalledTimes(2)
    expect(bodyParser).toHaveBeenCalledTimes(1)
    expect(cors).toHaveBeenCalledTimes(1)
  })

  it("does not wrap twice when installed twice", async () => {
    const { installNamespaceGuards } = load()
    const loader: any = {}
    const guard = jest.fn(async () => false)
    installNamespaceGuards(loader, { "/store": guard })
    const first = loader.traceMiddleware
    installNamespaceGuards(loader, { "/store": guard })

    expect(loader.traceMiddleware).toBe(first)
  })
})
