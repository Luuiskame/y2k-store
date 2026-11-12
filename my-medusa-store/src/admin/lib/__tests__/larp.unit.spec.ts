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
  const mantras = ["Locked in", "En tu prime", "W in the chat", "Sin excusas", "Que suene la caja"]

  it("leads with the motto, then a figure and a mantra by turns", () => {
    const items = tickerItems({
      motto: "Todo lo bueno está al otro lado del miedo.",
      facts: ["Hoy: L 4,250.00", "3 pedidos · Hoy"],
      mantras,
      seed: "2026-11-11",
    })
    expect(items[0]).toBe("Todo lo bueno está al otro lado del miedo.")
    expect(items[1]).toBe("Hoy: L 4,250.00")
    expect(mantras).toContain(items[2])
    expect(items[3]).toBe("3 pedidos · Hoy")
    expect(mantras).toContain(items[4])
    // Every figure given is on it.
    expect(items).toEqual(expect.arrayContaining(["Hoy: L 4,250.00", "3 pedidos · Hoy"]))
    // No mantra twice in the same lap.
    const said = items.filter((item) => mantras.includes(item))
    expect(new Set(said).size).toBe(said.length)
  })

  it("still runs with no figures yet, and starts elsewhere each day", () => {
    const quiet = tickerItems({ motto: "Lock in.", facts: [], mantras, seed: "2026-11-11" })
    expect(quiet[0]).toBe("Lock in.")
    expect(quiet.length).toBeGreaterThanOrEqual(4)
    expect(quiet.slice(1).every((item) => mantras.includes(item))).toBe(true)

    const starts = new Set(
      Array.from(
        { length: 20 },
        (_, day) => tickerItems({ motto: "x", facts: [], mantras, seed: `2026-11-${day + 1}` })[1]
      )
    )
    expect(starts.size).toBeGreaterThan(1)
  })

  it("is only the motto when there is nothing else to say", () => {
    expect(tickerItems({ motto: "Lock in.", facts: [], mantras: [], seed: "x" })).toEqual(["Lock in."])
  })
})
