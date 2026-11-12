import type { Mood } from "../i18n/dict/larp"

/**
 * Which line goes under the day's figure and what runs on the ticker. Pure.
 *
 * The rule that keeps this honest: every line is chosen by real figures. A
 * period above the previous one gets the lines for "up"; an empty one gets
 * the ones that say to lock in. There is no setting that makes the panel
 * cheer for a day that is not going well, and nothing here touches a number.
 */

const STORE_TIME_ZONE = "America/Tegucigalpa"

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Today in the store's time zone, as `YYYY-MM-DD`. */
export const storeDay = (now: number = Date.now()): string => dayFormat.format(now)

/** A period this far above or below the previous one is "up" or "down". */
const SWING = 0.15

export const moodOf = ({
  orders,
  change,
  today,
}: {
  orders: number
  /** Sales against the comparison period (0.2 is +20%); null with nothing to compare. */
  change: number | null
  /** Whether the period is today: only then is one order "the first of the day". */
  today: boolean
}): Mood => {
  if (orders <= 0) {
    return "quiet"
  }
  if (change !== null && change >= SWING) {
    return "up"
  }
  if (change !== null && change <= -SWING) {
    return "down"
  }
  return today && orders === 1 ? "first" : "cooking"
}

const hashOf = (text: string): number => {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash
}

/**
 * One of `lines`, the same one for the same `seed`. Seeded with the date, a
 * caption stays put all day (it would be noise if every refresh changed it)
 * and is another one tomorrow.
 */
export const pickLine = (lines: string[], seed: string): string =>
  lines.length === 0 ? "" : lines[hashOf(seed) % lines.length]

/** October 1 to December 31: the "winter arc", the season of locking in. */
const WINTER_ARC_DAYS = 92

/** The day of the winter arc `day` is (1 on October 1), or null out of season. */
export const winterArcDay = (day: string): { day: number; of: number } | null => {
  const [year, month, date] = day.split("-").map(Number)
  if (!year || !month || !date || month < 10) {
    return null
  }
  const elapsed = (Date.UTC(year, month - 1, date) - Date.UTC(year, 9, 1)) / 86_400_000
  return { day: Math.round(elapsed) + 1, of: WINTER_ARC_DAYS }
}

/**
 * What the ticker shows, in order: the motto, then the period's figures and
 * the phrases, every one of them, each list in its own order and spread
 * evenly through the other. Two figures and eight phrases do not run as two
 * pairs and six phrases in a row: a figure comes up every few phrases.
 *
 * The phrases are the owner's (Ajustes → Apariencia) or, until they write
 * their own, the panel's originals. All of them run on every lap, in the
 * order they were written: what is listed there is what is seen here.
 */
export const tickerItems = ({
  motto,
  facts,
  phrases,
}: {
  motto: string
  facts: string[]
  phrases: string[]
}): string[] => {
  // Each line gets a place between 0 and 1 along the lap; a figure and a
  // phrase due at the same place go figure first.
  const placed = [facts.filter(Boolean), phrases.filter(Boolean)].flatMap((lines, list) =>
    lines.map((text, index) => ({ text, at: (index + 0.5) / lines.length, list }))
  )
  placed.sort((a, b) => a.at - b.at || a.list - b.list)

  return [motto, ...placed.map((line) => line.text)].filter(Boolean)
}
