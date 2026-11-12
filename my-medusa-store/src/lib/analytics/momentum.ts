import { addDays } from "./time"

/**
 * How the store has been selling lately, as the kind of counter people post:
 * a streak of days with sales and "day N" since the first one.
 *
 * Pure: it is given the days that had a sale and what day it is. The query
 * that finds those days is in sales.ts.
 */
export type Momentum = {
  /**
   * Days in a row with at least one sale, ending today, or ending yesterday
   * while today has none yet: the streak is still alive until the day is
   * over, and it should not read as lost at eight in the morning.
   */
  streak: number
  /** Whether today is already one of them. */
  includes_today: boolean
  /** The longest run inside the window looked at (see WINDOW_DAYS). */
  best: number
  /** Days with a sale among the last 30, today included. */
  active_days_30: number
  /** Today counted from the first sale ever (1 on that day); null before it. */
  day_number: number | null
}

/** How far back streaks are looked for. A streak can be no longer than this. */
export const MOMENTUM_WINDOW_DAYS = 400

const DAY_MS = 86_400_000

const utc = (day: string): number => {
  const [y, m, d] = day.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

/**
 * `sellingDays` and `today` are store-local `YYYY-MM-DD`; the list may come
 * in any order and repeat days. `firstDay` is the day of the first sale ever,
 * which can be older than the window.
 */
export const momentumOf = (
  sellingDays: string[],
  today: string,
  firstDay: string | null
): Momentum => {
  // A sale dated after "today" can only be a clock disagreement; ignore it.
  const days = new Set(sellingDays.filter((day) => day <= today))

  const includesToday = days.has(today)
  let streak = 0
  for (
    let day = includesToday ? today : addDays(today, -1);
    days.has(day);
    day = addDays(day, -1)
  ) {
    streak += 1
  }

  let best = 0
  let run = 0
  let previous: string | null = null
  for (const day of [...days].sort()) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    previous = day
  }

  let active = 0
  for (let back = 0; back < 30; back += 1) {
    if (days.has(addDays(today, -back))) {
      active += 1
    }
  }

  return {
    streak,
    includes_today: includesToday,
    best,
    active_days_30: active,
    day_number:
      firstDay && firstDay <= today
        ? Math.round((utc(today) - utc(firstDay)) / DAY_MS) + 1
        : null,
  }
}
