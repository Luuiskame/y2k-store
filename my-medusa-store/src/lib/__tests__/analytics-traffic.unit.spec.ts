import { normalizePage } from "../analytics/classify"
import { memoryTrafficClient } from "../analytics/redis-client"
import { resolveRange } from "../analytics/time"
import {
  LIVE_WINDOW_MS,
  OVERFLOW_FIELD,
  TrafficEvent,
  createTrafficStore,
} from "../analytics/traffic"

/** Store-local wall-clock time in Tegucigalpa (UTC-6). */
const local = (day: string, hour: number, minute = 0) => {
  const [y, m, d] = day.split("-").map(Number)
  return Date.UTC(y, m - 1, d, hour + 6, minute)
}

const setup = (start: number, maxSessions?: number) => {
  let now = start
  const store = createTrafficStore(memoryTrafficClient(() => now), { maxSessions })
  return {
    store,
    at: (time: number) => {
      now = time
    },
    now: () => now,
  }
}

const event = (overrides: Partial<TrafficEvent> & { path?: string } = {}): TrafficEvent => {
  const { path = "/hn", ...rest } = overrides
  return {
    type: "pageview",
    visitorId: "visitor-aaaa",
    sessionId: "session-aaaa",
    page: normalizePage(path),
    device: "mobile",
    source: "instagram",
    country: "HN",
    city: "Tegucigalpa",
    newVisitor: true,
    hasCart: false,
    loggedIn: false,
    ...rest,
  }
}

describe("traffic store", () => {
  const morning = local("2026-09-27", 10, 0)

  it("counts a session once and every page it views", async () => {
    const { store } = setup(morning)

    await store.record(event(), morning)
    await store.record(event({ path: "/hn/store" }), morning + 5_000)
    await store.record(event({ type: "ping", path: "/hn/store" }), morning + 30_000)

    const live = await store.live(morning + 31_000)
    expect(live.active).toBe(1)
    expect(live.today.sessions).toBe(1)
    expect(live.today.pageviews).toBe(2)
    expect(live.visitors[0]).toMatchObject({
      path: "/store",
      page_type: "catalog",
      pages: 2,
      source: "instagram",
      landing: "/",
      city: "Tegucigalpa",
    })
  })

  it("counts milestones once per session, clicks every time", async () => {
    const { store } = setup(morning)

    await store.record(event({ path: "/hn/products/camiseta-cruz" }), morning)
    await store.record(event({ path: "/hn/products/camiseta-luna" }), morning + 1_000)
    await store.record(event({ type: "whatsapp", path: "/hn/products/camiseta-luna" }), morning + 2_000)
    await store.record(event({ type: "whatsapp", path: "/hn/products/camiseta-luna" }), morning + 3_000)
    await store.record(event({ type: "add_to_cart", path: "/hn/products/camiseta-luna" }), morning + 4_000)
    await store.record(event({ path: "/hn/checkout" }), morning + 5_000)

    const { today, visitors } = await store.live(morning + 6_000)
    expect(today).toMatchObject({
      sessions: 1,
      product_views: 2,
      viewed_product: 1,
      whatsapp_clicks: 2,
      contacted_whatsapp: 1,
      added_to_cart: 1,
      reached_checkout: 1,
      purchased: 0,
    })
    expect(visitors[0]).toMatchObject({
      contacted_whatsapp: true,
      added_to_cart: true,
      reached_checkout: true,
      purchased: false,
    })
  })

  it("keeps the source of the event that opened the session", async () => {
    const { store } = setup(morning)

    await store.record(event({ source: "instagram" }), morning)
    await store.record(event({ source: "directo", path: "/hn/store" }), morning + 1_000)

    const range = resolveRange({ preset: "today" }, morning + 2_000)
    const report = await store.report(range.current, range.previous, range.granularity, morning + 2_000)
    expect(report.sources).toEqual([{ key: "instagram", count: 1 }])
    expect(report.landing_pages).toEqual([{ key: "/", count: 1 }])
  })

  it("drops a visitor from the live list when the tab closes or goes quiet", async () => {
    const { store } = setup(morning)

    await store.record(event({ sessionId: "session-aaaa" }), morning)
    await store.record(event({ sessionId: "session-bbbb", visitorId: "visitor-bbbb" }), morning)
    await store.record(event({ type: "leave", sessionId: "session-aaaa" }), morning + 1_000)

    let live = await store.live(morning + 2_000)
    expect(live.active).toBe(1)
    expect(live.visitors.map((v) => v.id)).toEqual(["session-bbbb"])

    live = await store.live(morning + LIVE_WINDOW_MS + 1_000)
    expect(live.active).toBe(0)
    expect(live.recent).toBe(1)
  })

  it("continues a session that comes back after closing the tab", async () => {
    const { store } = setup(morning)

    await store.record(event(), morning)
    await store.record(event({ type: "leave" }), morning + 1_000)
    await store.record(event({ path: "/hn/store" }), morning + 60_000)

    const live = await store.live(morning + 61_000)
    expect(live.today.sessions).toBe(1)
    expect(live.active).toBe(1)
  })

  it("starts a new session after 30 idle minutes", async () => {
    const { store, at } = setup(morning)

    await store.record(event(), morning)
    at(morning + 31 * 60_000)
    await store.record(event({ path: "/hn/store" }), morning + 31 * 60_000)

    const live = await store.live(morning + 31 * 60_000)
    expect(live.today.sessions).toBe(2)
  })

  it("caps the pages hash so junk paths cannot grow it", async () => {
    const { store } = setup(morning)

    for (let i = 0; i < 305; i++) {
      await store.record(event({ path: `/hn/products/p-${i}` }), morning + i)
    }

    const range = resolveRange({ preset: "today" }, morning + 1_000)
    const report = await store.report(range.current, range.previous, range.granularity, morning + 1_000)
    expect(report.pages).toHaveLength(300)
    expect(report.pages[0]).toEqual({ key: OVERFLOW_FIELD, count: 5 })
  })

  it("stops tracking new sessions at the cap, keeps tracking known ones", async () => {
    const { store } = setup(morning, 3)

    for (let i = 0; i < 3; i++) {
      await store.record(event({ sessionId: `session-${i}-xxxx` }), morning)
    }

    expect(await store.record(event({ sessionId: "session-late-xxxx" }), morning)).toBe(false)
    expect(await store.record(event({ sessionId: "session-1-xxxx", path: "/hn/store" }), morning)).toBe(true)
  })

  it("compares with yesterday up to the same minute", async () => {
    const now = local("2026-09-27", 10, 30)
    const { store, at } = setup(local("2026-09-26", 9, 0))

    const yesterday = [
      local("2026-09-26", 9, 0),
      local("2026-09-26", 10, 5),
      local("2026-09-26", 10, 10),
      local("2026-09-26", 10, 40),
      local("2026-09-26", 10, 50),
      local("2026-09-26", 15, 0),
    ]
    for (const [i, time] of yesterday.entries()) {
      at(time)
      await store.record(
        event({ sessionId: `yesterday-${i}-xx`, visitorId: `visitor-${i}-xx` }),
        time
      )
    }

    at(now)
    await store.record(event({ sessionId: "today-0-xxxx", visitorId: "visitor-0-xx" }), local("2026-09-27", 9, 0))
    await store.record(event({ sessionId: "today-1-xxxx", visitorId: "visitor-9-xx" }), local("2026-09-27", 10, 20))

    const range = resolveRange({ preset: "today" }, now)
    const report = await store.report(range.current, range.previous, range.granularity, now)

    // 09:00 counts in full; the four sessions of the 10:00 hour count for half
    // of it, the part before 10:30; 15:00 is after the cut.
    expect(report.previous.sessions).toBe(3)
    expect(report.totals.sessions).toBe(2)
    expect(report.series.current.sessions[10]).toBe(1)
    expect(report.series.current.sessions[11]).toBeNull()
    expect(report.series.previous.sessions[15]).toBe(1)
    expect(report.totals.visitors).toBe(2)
    expect(report.previous.visitors).toBe(6)
  })
})
