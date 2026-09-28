/**
 * Calendar math for the dashboard, always in the store's time zone.
 *
 * "Today" is Honduras' today, whatever time zone the server or the admin's
 * browser happens to be in: Railway runs in UTC, so a sale at 7 pm in
 * Tegucigalpa is already tomorrow there. Every day boundary, bucket and
 * comparison window comes from here, so the SQL (`AT TIME ZONE`) and the
 * Redis day keys agree on what a day is.
 */

export const STORE_TIME_ZONE = "America/Tegucigalpa"

/** Past this many days, a range is refused. Also bounds the Redis reads. */
export const MAX_RANGE_DAYS = 400

const pad = (n: number) => String(n).padStart(2, "0")

// `hourCycle: "h23"` because `hour12: false` prints midnight as "24" on some
// engines, which would turn into a 25th hourly bucket.
const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

export type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export const zonedParts = (ms: number): ZonedParts => {
  const parts: Record<string, string> = {}
  for (const part of partsFormatter.formatToParts(new Date(ms))) {
    parts[part.type] = part.value
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** `YYYY-MM-DD` of the store-local day `ms` falls on. */
export const dayKey = (ms: number): string => {
  const p = zonedParts(ms)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Store-local hour of `ms`, `00`–`23`. */
export const hourKey = (ms: number): string => pad(zonedParts(ms).hour)

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** A real calendar day, not just the right shape: `2026-02-30` is refused. */
export const isDay = (value: string): boolean => {
  if (!DAY_PATTERN.test(value)) {
    return false
  }

  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

const fromUtcDate = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`

export const addDays = (day: string, days: number): string => {
  const [y, m, d] = day.split("-").map(Number)
  return fromUtcDate(new Date(Date.UTC(y, m - 1, d + days)))
}

/**
 * Same day of the month, `months` away, clamped to the target month's length:
 * one month before March 31 is February 28 (or 29), not March 3.
 */
export const addMonths = (day: string, months: number): string => {
  const [y, m, d] = day.split("-").map(Number)
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  return fromUtcDate(new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))))
}

/** Every day from `from` to `to`, both included. */
export const listDays = (from: string, to: string): string[] => {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push(day)
  }
  return days
}

/** How far ahead of UTC the store's wall clock is at `ms`. */
const zoneOffsetAt = (ms: number): number => {
  const p = zonedParts(ms)
  const wallClockAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second
  )
  return wallClockAsUtc - Math.floor(ms / 1000) * 1000
}

/**
 * The instant store-local midnight begins `day`. Honduras has had no daylight
 * saving time since 2006, but the second pass keeps this right for a zone that
 * does, where the offset at midnight differs from the offset at UTC midnight.
 */
export const startOfDay = (day: string): number => {
  const [y, m, d] = day.split("-").map(Number)
  const utcMidnight = Date.UTC(y, m - 1, d)
  const firstGuess = utcMidnight - zoneOffsetAt(utcMidnight)
  return utcMidnight - zoneOffsetAt(firstGuess)
}

export const PRESETS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "this_month",
  "last_month",
  "this_year",
] as const

export type Preset = (typeof PRESETS)[number]

/**
 * How the comparison period is found. Rolling windows compare with the window
 * right before them; calendar presets compare with the same stretch of the
 * previous month or year, the way Shopify does, so "este mes" on the 27th is
 * measured against the 1st–27th of last month rather than against a 27-day
 * window that straddles two months.
 */
type Shift = "days" | "month" | "year"

const presetDays = (
  preset: Preset,
  today: string
): { from: string; to: string; shift: Shift } => {
  const [y, m] = today.split("-")

  switch (preset) {
    case "today":
      return { from: today, to: today, shift: "days" }
    case "yesterday": {
      const yesterday = addDays(today, -1)
      return { from: yesterday, to: yesterday, shift: "days" }
    }
    case "last_7_days":
      return { from: addDays(today, -6), to: today, shift: "days" }
    case "last_30_days":
      return { from: addDays(today, -29), to: today, shift: "days" }
    case "last_90_days":
      return { from: addDays(today, -89), to: today, shift: "days" }
    case "this_month":
      return { from: `${y}-${m}-01`, to: today, shift: "month" }
    case "last_month": {
      const firstOfThisMonth = `${y}-${m}-01`
      return {
        from: addMonths(firstOfThisMonth, -1),
        to: addDays(firstOfThisMonth, -1),
        shift: "month",
      }
    }
    case "this_year":
      return { from: `${y}-01-01`, to: today, shift: "year" }
  }
}

export type Granularity = "hour" | "day" | "month"

export type Period = {
  /** First and last store-local day, both included. */
  from: string
  to: string
  days: string[]
  /** Epoch ms, end exclusive. */
  start: number
  end: number
  /**
   * Store-local time of day at which the last day stops counting, or null
   * when that day counts in full. Traffic is kept per hour, not per instant,
   * so the Redis side needs the cut as a time of day rather than as `end`.
   */
  cutoff: { hour: number; minute: number } | null
}

export type ResolvedRange = {
  current: Period
  /**
   * The period the current one is measured against. When the range runs up to
   * right now, both stop at the same time of day, so "hoy" at 10 am is
   * compared with yesterday until 10 am, not with all of yesterday.
   */
  previous: Period
  granularity: Granularity
}

const periodOf = (from: string, to: string, end: number): Period => {
  const start = startOfDay(from)
  const endOfLastDay = startOfDay(addDays(to, 1))
  const clampedEnd = Math.min(end, endOfLastDay)
  const { hour, minute } = zonedParts(clampedEnd)

  return {
    from,
    to,
    days: listDays(from, to),
    start,
    end: clampedEnd,
    cutoff: clampedEnd < endOfLastDay ? { hour, minute } : null,
  }
}

export class InvalidRangeError extends Error {}

/**
 * Turns a preset, or an explicit `from`/`to`, into the two periods the
 * dashboard compares. `to` is clamped to today: the future has no sales yet
 * and asking for it would only drag the averages down.
 */
export const resolveRange = (
  input: { preset?: Preset; from?: string; to?: string },
  now: number = Date.now()
): ResolvedRange => {
  const today = dayKey(now)

  let from: string
  let to: string
  let shift: Shift = "days"

  if (input.preset) {
    ;({ from, to, shift } = presetDays(input.preset, today))
  } else if (input.from && input.to) {
    if (!isDay(input.from) || !isDay(input.to)) {
      throw new InvalidRangeError("Las fechas deben tener el formato AAAA-MM-DD.")
    }
    from = input.from
    to = input.to < today ? input.to : today
  } else {
    ;({ from, to, shift } = presetDays("last_30_days", today))
  }

  if (from > to) {
    throw new InvalidRangeError("La fecha inicial es posterior a la final.")
  }

  const days = listDays(from, to)
  if (days.length > MAX_RANGE_DAYS) {
    throw new InvalidRangeError(`El rango máximo es de ${MAX_RANGE_DAYS} días.`)
  }

  const runsToNow = to === today
  const current = periodOf(from, to, runsToNow ? now : Infinity)

  const shiftDay = (day: string) =>
    shift === "month"
      ? addMonths(day, -1)
      : shift === "year"
      ? addMonths(day, -12)
      : addDays(day, -days.length)

  // Shifted by months, `to` can fall past the end of a shorter month (March 31
  // becomes February 28); addMonths clamps it and periodOf clamps the end.
  const previousFrom = shiftDay(from)
  const elapsed = current.end - current.start

  return {
    current,
    previous: periodOf(
      previousFrom,
      shiftDay(to),
      runsToNow ? startOfDay(previousFrom) + elapsed : Infinity
    ),
    granularity:
      days.length === 1 ? "hour" : days.length <= 92 ? "day" : "month",
  }
}

/**
 * The bucket keys of one period, in order: `00`–`23` for a single day,
 * `YYYY-MM-DD` per day, or `YYYY-MM` per month. The same strings the SQL's
 * `to_char` produces, so both sides line up without translation.
 */
export const bucketsFor = (period: Period, granularity: Granularity): string[] => {
  if (granularity === "hour") {
    return Array.from({ length: 24 }, (_, h) => pad(h))
  }

  if (granularity === "day") {
    return period.days
  }

  return [...new Set(period.days.map((day) => day.slice(0, 7)))]
}

export const bucketOfDay = (day: string, granularity: Granularity): string =>
  granularity === "month" ? day.slice(0, 7) : day

/**
 * The bucket `now` falls in, when the period runs up to now; null otherwise.
 * Series leave the buckets after it empty rather than zero, so a chart line
 * for "hoy" stops at the current hour instead of diving to 0 at midnight.
 */
export const currentBucket = (
  range: ResolvedRange,
  now: number = Date.now()
): string | null => {
  if (range.current.to !== dayKey(now)) {
    return null
  }
  if (range.granularity === "hour") {
    return hourKey(now)
  }
  return bucketOfDay(dayKey(now), range.granularity)
}

/** What the API tells the dashboard about the range it resolved. */
export const describeRange = (range: ResolvedRange) => ({
  from: range.current.from,
  to: range.current.to,
  previous_from: range.previous.from,
  previous_to: range.previous.to,
  granularity: range.granularity,
  days: range.current.days.length,
})
