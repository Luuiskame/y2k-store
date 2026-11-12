import { MOMENTUM_WINDOW_DAYS, momentumOf } from "../analytics/momentum"

const TODAY = "2026-11-11"

describe("the streak of days with sales", () => {
  it("counts back from today while every day has a sale", () => {
    const days = ["2026-11-11", "2026-11-10", "2026-11-09", "2026-11-07"]
    expect(momentumOf(days, TODAY, "2026-04-14")).toMatchObject({
      streak: 3,
      includes_today: true,
    })
  })

  it("is still alive in the morning, before today's first sale", () => {
    // Sold yesterday and the day before; nothing yet today.
    const momentum = momentumOf(["2026-11-10", "2026-11-09"], TODAY, "2026-04-14")
    expect(momentum.streak).toBe(2)
    expect(momentum.includes_today).toBe(false)
  })

  it("is over once a whole day passed with no sale", () => {
    expect(momentumOf(["2026-11-09", "2026-11-08"], TODAY, "2026-04-14")).toMatchObject({
      streak: 0,
      includes_today: false,
    })
    expect(momentumOf([], TODAY, null)).toEqual({
      streak: 0,
      includes_today: false,
      best: 0,
      active_days_30: 0,
      day_number: null,
    })
  })

  it("does not mind the order of the days or a day listed twice", () => {
    const days = ["2026-11-09", "2026-11-11", "2026-11-10", "2026-11-11", "2026-11-09"]
    expect(momentumOf(days, TODAY, "2026-11-09").streak).toBe(3)
  })

  it("crosses the end of a month and of a year", () => {
    expect(momentumOf(["2026-11-01", "2026-10-31", "2026-10-30"], "2026-11-01", null).streak).toBe(3)
    expect(momentumOf(["2027-01-01", "2026-12-31"], "2027-01-01", null).streak).toBe(2)
    // 2028 is a leap year: February 29 is a day like any other.
    expect(momentumOf(["2028-03-01", "2028-02-29", "2028-02-28"], "2028-03-01", null).streak).toBe(3)
  })

  it("ignores a sale dated after today", () => {
    // A server clock ahead of the store's must not lengthen or start a streak.
    expect(momentumOf(["2026-11-12", "2026-11-11"], TODAY, "2026-11-11")).toMatchObject({
      streak: 1,
      best: 1,
      active_days_30: 1,
    })
  })
})

describe("the rest of the store's momentum", () => {
  it("remembers the longest run in the window, current or not", () => {
    const days = [
      // Five in a row in October…
      "2026-10-05",
      "2026-10-04",
      "2026-10-03",
      "2026-10-02",
      "2026-10-01",
      // …and two now.
      "2026-11-11",
      "2026-11-10",
    ]
    expect(momentumOf(days, TODAY, "2026-04-14")).toMatchObject({ streak: 2, best: 5 })
    // While the current run is the longest, it is the record.
    expect(momentumOf(["2026-11-11", "2026-11-10", "2026-11-09"], TODAY, null).best).toBe(3)
  })

  it("counts the days with sales among the last thirty, today included", () => {
    const days = ["2026-11-11", "2026-11-01", "2026-10-13", "2026-10-12"]
    // October 13 is the thirtieth day back; October 12 is out.
    expect(momentumOf(days, TODAY, null).active_days_30).toBe(3)
  })

  it("numbers today from the first sale ever", () => {
    expect(momentumOf([TODAY], TODAY, TODAY).day_number).toBe(1)
    expect(momentumOf([TODAY], TODAY, "2026-11-10").day_number).toBe(2)
    expect(momentumOf([], TODAY, "2026-01-01").day_number).toBe(315)
    // Before any sale there is no day one, and a first sale "in the future"
    // (a clock disagreement) is not counted backwards.
    expect(momentumOf([], TODAY, null).day_number).toBeNull()
    expect(momentumOf([], TODAY, "2026-11-12").day_number).toBeNull()
  })

  it("can hold a streak as long as the window it looks at", () => {
    const start = Date.UTC(2026, 10, 11)
    const everyDay = Array.from({ length: MOMENTUM_WINDOW_DAYS }, (_, back) =>
      new Date(start - back * 86_400_000).toISOString().slice(0, 10)
    )
    const momentum = momentumOf(everyDay, TODAY, everyDay[everyDay.length - 1])
    expect(momentum.streak).toBe(MOMENTUM_WINDOW_DAYS)
    expect(momentum.best).toBe(MOMENTUM_WINDOW_DAYS)
    expect(momentum.active_days_30).toBe(30)
    expect(momentum.day_number).toBe(MOMENTUM_WINDOW_DAYS)
  })
})
