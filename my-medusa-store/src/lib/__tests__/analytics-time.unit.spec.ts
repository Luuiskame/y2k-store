import {
  InvalidRangeError,
  addMonths,
  bucketsFor,
  currentBucket,
  dayKey,
  hourKey,
  isDay,
  resolveRange,
  startOfDay,
} from "../analytics/time"

/** Store-local wall-clock time in Tegucigalpa (UTC-6, no daylight saving). */
const local = (day: string, hour: number, minute = 0) => {
  const [y, m, d] = day.split("-").map(Number)
  return Date.UTC(y, m - 1, d, hour + 6, minute)
}

describe("store-local calendar", () => {
  it("puts an evening sale on the Honduran day, not the UTC one", () => {
    // 04:30 UTC on the 28th is 22:30 on the 27th in Tegucigalpa.
    const at = Date.UTC(2026, 8, 28, 4, 30)
    expect(dayKey(at)).toBe("2026-09-27")
    expect(hourKey(at)).toBe("22")
  })

  it("starts the day at local midnight", () => {
    expect(startOfDay("2026-09-27")).toBe(Date.UTC(2026, 8, 27, 6, 0))
  })

  it("prints midnight as hour 00, never 24", () => {
    expect(hourKey(local("2026-09-27", 0, 5))).toBe("00")
  })

  it("accepts only real calendar days", () => {
    expect(isDay("2026-02-28")).toBe(true)
    expect(isDay("2024-02-29")).toBe(true)
    expect(isDay("2026-02-30")).toBe(false)
    expect(isDay("2026-2-28")).toBe(false)
    expect(isDay("hoy")).toBe(false)
  })

  it("clamps a month shift to the shorter month", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28")
    expect(addMonths("2024-03-31", -1)).toBe("2024-02-29")
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15")
  })
})

describe("resolveRange", () => {
  const now = local("2026-09-27", 16, 30)

  it("compares today with yesterday up to the same time", () => {
    const range = resolveRange({ preset: "today" }, now)

    expect(range.granularity).toBe("hour")
    expect(range.current).toMatchObject({
      from: "2026-09-27",
      to: "2026-09-27",
      start: startOfDay("2026-09-27"),
      end: now,
      cutoff: { hour: 16, minute: 30 },
    })
    expect(range.previous).toMatchObject({
      from: "2026-09-26",
      to: "2026-09-26",
      start: startOfDay("2026-09-26"),
      end: local("2026-09-26", 16, 30),
      cutoff: { hour: 16, minute: 30 },
    })
  })

  it("compares a rolling week with the week before it", () => {
    const range = resolveRange({ preset: "last_7_days" }, now)

    expect(range.granularity).toBe("day")
    expect(range.current.days).toHaveLength(7)
    expect(range.current.from).toBe("2026-09-21")
    expect(range.previous.from).toBe("2026-09-14")
    expect(range.previous.to).toBe("2026-09-20")
    expect(range.previous.end).toBe(local("2026-09-20", 16, 30))
  })

  it("compares a month so far with the same days of last month", () => {
    const range = resolveRange({ preset: "this_month" }, now)

    expect(range.current.from).toBe("2026-09-01")
    expect(range.previous.from).toBe("2026-08-01")
    expect(range.previous.to).toBe("2026-08-27")
    expect(range.previous.end).toBe(local("2026-08-27", 16, 30))
  })

  it("counts all of a shorter previous month rather than spilling into the next", () => {
    const range = resolveRange(
      { preset: "this_month" },
      local("2026-03-31", 12, 0)
    )

    expect(range.previous.from).toBe("2026-02-01")
    expect(range.previous.to).toBe("2026-02-28")
    expect(range.previous.end).toBe(startOfDay("2026-03-01"))
    expect(range.previous.cutoff).toBeNull()
  })

  it("resolves last month as whole days with no cutoff", () => {
    const range = resolveRange({ preset: "last_month" }, now)

    expect(range.current).toMatchObject({
      from: "2026-08-01",
      to: "2026-08-31",
      end: startOfDay("2026-09-01"),
      cutoff: null,
    })
    expect(range.previous).toMatchObject({
      from: "2026-07-01",
      to: "2026-07-31",
      cutoff: null,
    })
  })

  it("groups a year by month and compares it with last year", () => {
    const range = resolveRange({ preset: "this_year" }, now)

    expect(range.granularity).toBe("month")
    expect(range.previous.from).toBe("2025-01-01")
    expect(range.previous.to).toBe("2025-09-27")
    expect(bucketsFor(range.current, range.granularity)).toHaveLength(9)
  })

  it("clamps an explicit range to today", () => {
    const range = resolveRange({ from: "2026-09-20", to: "2026-12-31" }, now)
    expect(range.current.to).toBe("2026-09-27")
    expect(range.current.end).toBe(now)
  })

  it("refuses ranges it cannot answer", () => {
    expect(() => resolveRange({ from: "2026-09-27", to: "2026-09-01" }, now)).toThrow(
      InvalidRangeError
    )
    expect(() => resolveRange({ from: "2026-02-30", to: "2026-03-01" }, now)).toThrow(
      InvalidRangeError
    )
    expect(() => resolveRange({ from: "2024-01-01", to: "2026-09-27" }, now)).toThrow(
      InvalidRangeError
    )
  })

  it("defaults to the last 30 days", () => {
    const range = resolveRange({}, now)
    expect(range.current.days).toHaveLength(30)
    expect(range.current.to).toBe("2026-09-27")
  })
})

describe("buckets", () => {
  const now = local("2026-09-27", 16, 30)

  it("names 24 hourly buckets for a single day", () => {
    const range = resolveRange({ preset: "today" }, now)
    const buckets = bucketsFor(range.current, range.granularity)
    expect(buckets).toHaveLength(24)
    expect(buckets[0]).toBe("00")
    expect(buckets[23]).toBe("23")
  })

  it("marks the bucket now falls in, only for a range that runs to now", () => {
    expect(currentBucket(resolveRange({ preset: "today" }, now), now)).toBe("16")
    expect(currentBucket(resolveRange({ preset: "last_7_days" }, now), now)).toBe(
      "2026-09-27"
    )
    expect(currentBucket(resolveRange({ preset: "this_year" }, now), now)).toBe(
      "2026-09"
    )
    expect(currentBucket(resolveRange({ preset: "yesterday" }, now), now)).toBeNull()
  })
})
