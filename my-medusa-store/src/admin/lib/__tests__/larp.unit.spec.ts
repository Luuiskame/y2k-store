import { DICTS } from "../../i18n/dictionary"
import { moodOf, pickLine, storeDay, tickerItems, winterArcDay } from "../larp"

describe("the mood of a period", () => {
  it("is read off the real figures, never chosen", () => {
    // Nothing sold: there is nothing to cheer.
    expect(moodOf({ orders: 0, change: null, today: true })).toBe("quiet")
    expect(moodOf({ orders: 0, change: 0.9, today: false })).toBe("quiet")

    // Clearly above or below the period it is compared with.
    expect(moodOf({ orders: 8, change: 0.4, today: true })).toBe("up")
    expect(moodOf({ orders: 8, change: 0.15, today: false })).toBe("up")
    expect(moodOf({ orders: 3, change: -0.5, today: true })).toBe("down")
    expect(moodOf({ orders: 3, change: -0.15, today: false })).toBe("down")

    // Selling, about level or with nothing to compare with.
    expect(moodOf({ orders: 5, change: 0.05, today: true })).toBe("cooking")
    expect(moodOf({ orders: 5, change: -0.1, today: false })).toBe("cooking")
    expect(moodOf({ orders: 5, change: null, today: false })).toBe("cooking")
  })

  it("only calls one order «the first of the day» today", () => {
    expect(moodOf({ orders: 1, change: null, today: true })).toBe("first")
    expect(moodOf({ orders: 1, change: 0.02, today: true })).toBe("first")
    // One order in a whole month is not a first of anything.
    expect(moodOf({ orders: 1, change: null, today: false })).toBe("cooking")
    // And a day well behind yesterday says so, first order or not.
    expect(moodOf({ orders: 1, change: -0.6, today: true })).toBe("down")
  })

  it("has lines to say for every mood, in both languages", () => {
    for (const lang of ["es", "en"] as const) {
      for (const mood of ["quiet", "first", "cooking", "up", "down"] as const) {
        const line = pickLine(DICTS[lang].larp.captions[mood], `2026-11-11:today:${mood}`)
        expect(DICTS[lang].larp.captions[mood]).toContain(line)
      }
    }
  })
})

describe("pickLine", () => {
  const lines = ["uno", "dos", "tres", "cuatro"]

  it("keeps the same line for the same day and changes with the days", () => {
    expect(pickLine(lines, "2026-11-11")).toBe(pickLine(lines, "2026-11-11"))
    const month = Array.from({ length: 30 }, (_, day) =>
      pickLine(lines, `2026-11-${String(day + 1).padStart(2, "0")}`)
    )
    // Over a month every line gets its turn.
    expect(new Set(month)).toEqual(new Set(lines))
  })

  it("has nothing to pick from an empty list", () => {
    expect(pickLine([], "2026-11-11")).toBe("")
    expect(pickLine(["sola"], "cualquier cosa")).toBe("sola")
  })
})

describe("storeDay", () => {
  it("is the date in Honduras, not in UTC or in the browser", () => {
    // 04:30 UTC on the 12th is still 22:30 on the 11th in Tegucigalpa.
    expect(storeDay(Date.UTC(2026, 10, 12, 4, 30))).toBe("2026-11-11")
    expect(storeDay(Date.UTC(2026, 10, 12, 6, 0))).toBe("2026-11-12")
    expect(storeDay(Date.UTC(2027, 0, 1, 5, 59))).toBe("2026-12-31")
  })
})

describe("winterArcDay", () => {
  it("counts from October 1 to December 31", () => {
    expect(winterArcDay("2026-10-01")).toEqual({ day: 1, of: 92 })
    expect(winterArcDay("2026-11-11")).toEqual({ day: 42, of: 92 })
    expect(winterArcDay("2026-12-31")).toEqual({ day: 92, of: 92 })
  })

  it("is out of season the rest of the year", () => {
    expect(winterArcDay("2026-09-30")).toBeNull()
    expect(winterArcDay("2027-01-01")).toBeNull()
    expect(winterArcDay("2026-06-15")).toBeNull()
    expect(winterArcDay("no es una fecha")).toBeNull()
  })
})

describe("tickerItems", () => {
  const motto = "Todo lo bueno está al otro lado del miedo."
  const phrases = ["Vendo ropa, no excusas", "Hecho en Tegus", "Cada pedido cuenta", "Y2K o nada"]

  it("leads with the motto, then a figure and a phrase by turns", () => {
    expect(
      tickerItems({ motto, facts: ["Hoy: L 4,250.00", "3 pedidos · Hoy"], phrases: phrases.slice(0, 2) })
    ).toEqual([
      motto,
      "Hoy: L 4,250.00",
      "Vendo ropa, no excusas",
      "3 pedidos · Hoy",
      "Hecho en Tegus",
    ])
  })

  it("runs every phrase the owner wrote, in the order they wrote them", () => {
    const facts = ["Hoy: L 4,250.00", "3 pedidos · Hoy"]
    const items = tickerItems({ motto, facts, phrases })
    expect(items).toHaveLength(1 + facts.length + phrases.length)
    expect(items.filter((item) => phrases.includes(item))).toEqual(phrases)
    expect(items.filter((item) => facts.includes(item))).toEqual(facts)
  })

  it("spreads the shorter list through the longer one instead of bunching it", () => {
    // Two figures among four phrases: one in each half, never side by side.
    expect(tickerItems({ motto, facts: ["F1", "F2"], phrases: ["a", "b", "c", "d"] })).toEqual([
      motto,
      "a",
      "F1",
      "b",
      "c",
      "F2",
      "d",
    ])
    // And the other way around: six figures, two phrases.
    const items = tickerItems({
      motto,
      facts: ["F1", "F2", "F3", "F4", "F5", "F6"],
      phrases: ["a", "b"],
    })
    expect(items).toEqual([motto, "F1", "F2", "a", "F3", "F4", "F5", "b", "F6"])
  })

  it("still runs with no figures yet, and with no phrases at all", () => {
    expect(tickerItems({ motto: "Lock in.", facts: [], phrases })).toEqual(["Lock in.", ...phrases])
    expect(tickerItems({ motto: "Lock in.", facts: ["Hoy: L 0.00"], phrases: [] })).toEqual([
      "Lock in.",
      "Hoy: L 0.00",
    ])
    expect(tickerItems({ motto: "Lock in.", facts: [], phrases: [] })).toEqual(["Lock in."])
  })

  it("leaves out anything blank", () => {
    expect(tickerItems({ motto: "", facts: ["", "F"], phrases: ["", "a"] })).toEqual(["F", "a"])
  })
})
