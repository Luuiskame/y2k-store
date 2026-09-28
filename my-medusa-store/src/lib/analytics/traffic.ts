import {
  Device,
  NormalizedPage,
  PageType,
  Source,
} from "./classify"
import {
  TrafficClient,
  memoryTrafficClient,
  redisTrafficClient,
} from "./redis-client"
import {
  Granularity,
  Period,
  bucketOfDay,
  bucketsFor,
  dayKey,
  hourKey,
} from "./time"

/**
 * Storefront traffic, kept in Redis as counters rather than as rows.
 *
 * Every visitor's browser sends a beacon on each page, then every 30 s while
 * the tab is visible. Writing those to Postgres would put a Neon write behind
 * every one of them — Neon, whose transfer cap already took the shop down once
 * — for numbers nobody needs row by row. So the live view is a sorted set of
 * sessions by last beacon, and history is a few small hashes per day:
 *
 *   analytics:live              sorted set  session id -> last beacon (ms)
 *   analytics:sess:<sid>        hash        what the session is doing now
 *   analytics:d:<day>           hash        `<metric>:<hour>` -> count
 *   analytics:d:<day>:b         hash        per-session breakdowns (device…)
 *   analytics:d:<day>:uv        HyperLogLog unique visitors
 *   analytics:d:<day>:pg|ln|wa|ct  hashes   pages, landing pages, WhatsApp
 *                                           clicks per page, cities (capped)
 *
 * This Redis also runs the event bus, the workflow engine and the locks, with
 * `noeviction`: if it fills up, those stop. So every key here either expires
 * or is capped, and the number of live sessions is capped too — a flood of
 * fake session ids costs a bounded amount of memory and then gets dropped.
 *
 * Writing counters directly instead of through a workflow is deliberate: these
 * are not commerce data, nothing needs to roll back, and a workflow run per
 * beacon would cost more than the beacon.
 */

/**
 * How long after its last beacon a session still counts as "on the site now".
 * The storefront pings every 30 s while the tab is visible, so this survives
 * one lost ping and drops a closed tab within a minute and a half.
 */
export const LIVE_WINDOW_MS = 90_000

/** The wider "last 30 minutes" figure next to the live count. */
export const RECENT_WINDOW_MS = 30 * 60_000

/** A session ends after 30 minutes without a beacon, as in Shopify and GA. */
const SESSION_IDLE_SECONDS = 30 * 60

/** The live index only has to cover the recent window; older entries go. */
const LIVE_INDEX_RETENTION_MS = RECENT_WINDOW_MS

/** A year of history plus the comparison period that goes with it. */
const DAY_TTL_SECONDS = 400 * 24 * 60 * 60

/**
 * Sessions seen in the last half hour past which a new session is not
 * tracked. Hundreds of times this shop's real traffic; it exists so that a
 * script inventing session ids cannot grow Redis without limit.
 */
const MAX_TRACKED_SESSIONS = 5000

/** Field caps for the hashes keyed on paths and cities. */
const CAPS = { pages: 300, landing: 200, whatsapp: 200, cities: 150 }

/** Where fields past a cap are counted. */
export const OVERFLOW_FIELD = "(otras)"

/** How long a beacon may wait on Redis before it is given up on. */
const WRITE_DEADLINE_MS = 500

/** Reads cover up to 400 days in one pipeline; allow for that. */
const READ_DEADLINE_MS = 5_000

const KEYS = {
  live: "analytics:live",
  session: (sid: string) => `analytics:sess:${sid}`,
  day: (day: string) => `analytics:d:${day}`,
  breakdown: (day: string) => `analytics:d:${day}:b`,
  visitors: (day: string) => `analytics:d:${day}:uv`,
  pages: (day: string) => `analytics:d:${day}:pg`,
  landing: (day: string) => `analytics:d:${day}:ln`,
  whatsapp: (day: string) => `analytics:d:${day}:wa`,
  cities: (day: string) => `analytics:d:${day}:ct`,
}

/** Short field names: there is one of these per metric per hour per day. */
const METRICS = {
  sessions: "s",
  pageviews: "pv",
  product_views: "pp",
  viewed_product: "vp",
  added_to_cart: "ac",
  reached_checkout: "ck",
  contacted_whatsapp: "wa",
  whatsapp_clicks: "wc",
  purchased: "by",
} as const

export type Metric = keyof typeof METRICS

type MetricField = (typeof METRICS)[Metric]

export type Totals = Record<Metric, number>

const METRIC_NAMES = Object.keys(METRICS) as Metric[]

export const EVENT_TYPES = [
  "pageview",
  "ping",
  "leave",
  "add_to_cart",
  "whatsapp",
  "purchase",
] as const

export type EventType = (typeof EVENT_TYPES)[number]

/** A beacon once the API route has validated and classified it. */
export type TrafficEvent = {
  type: EventType
  visitorId: string
  sessionId: string
  page: NormalizedPage
  device: Device
  /** Only read on the first event of a session. */
  source: Source
  country: string | null
  city: string | null
  newVisitor: boolean
  hasCart: boolean
  loggedIn: boolean
}

/**
 * The once-per-session milestone an event marks, if any. Counted the first
 * time only, so these read as "sessions that…", the way Shopify's conversion
 * funnel does.
 *
 * "Purchased" comes from an explicit event, not from the confirmation page's
 * path: customers go back to that page to upload their transfer receipt,
 * sometimes days later, and each visit would count as another sale.
 */
const milestoneFor = (event: TrafficEvent): MetricField | null => {
  switch (event.type) {
    case "pageview":
      if (event.page.type === "product") {
        return METRICS.viewed_product
      }
      if (event.page.type === "checkout") {
        return METRICS.reached_checkout
      }
      return null
    case "add_to_cart":
      return METRICS.added_to_cart
    case "whatsapp":
      return METRICS.contacted_whatsapp
    case "purchase":
      return METRICS.purchased
    default:
      return null
  }
}

const withDeadline = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`redis call exceeded ${ms}ms`)),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

export type LiveVisitor = {
  id: string
  path: string
  page_type: PageType
  handle: string | null
  device: string
  country: string | null
  city: string | null
  source: string
  landing: string | null
  started_at: number
  last_seen_at: number
  pages: number
  has_cart: boolean
  logged_in: boolean
  added_to_cart: boolean
  reached_checkout: boolean
  contacted_whatsapp: boolean
  purchased: boolean
}

export type LiveSnapshot = {
  /** Sessions with a beacon in the last LIVE_WINDOW_MS. */
  active: number
  /** Sessions with a beacon in the last RECENT_WINDOW_MS. */
  recent: number
  /** The most recently seen of the active sessions, newest first. */
  visitors: LiveVisitor[]
  /** Today so far, from the hourly counters. */
  today: Totals
}

export type Ranked = { key: string; count: number }

export type TrafficReport = {
  totals: Totals & { visitors: number; new_visitors: number; returning_visitors: number }
  previous: Totals & { visitors: number }
  series: SeriesPair
  devices: Ranked[]
  sources: Ranked[]
  countries: Ranked[]
  cities: Ranked[]
  pages: Ranked[]
  landing_pages: Ranked[]
  whatsapp_pages: Ranked[]
}

type Series = { buckets: string[]; sessions: (number | null)[]; pageviews: (number | null)[] }

export type SeriesPair = { current: Series; previous: Series }

const emptyTotals = (): Totals =>
  Object.fromEntries(METRIC_NAMES.map((name) => [name, 0])) as Totals

const pad = (n: number) => String(n).padStart(2, "0")

const HOURS = Array.from({ length: 24 }, (_, h) => pad(h))

/** Per-hour counts of one metric from one day's hash. */
const hourly = (hash: Record<string, string>, field: MetricField): number[] =>
  HOURS.map((hour) => Number(hash[`${field}:${hour}`] ?? 0))

/**
 * One day's total of a metric, optionally cut at a time of day. The hour the
 * cut falls in is counted pro rata: cutting at 10:30 takes half of the 10:00
 * hour. Close enough for a comparison, and fairer than all or none of it.
 */
const dayTotal = (
  hash: Record<string, string>,
  field: MetricField,
  cutoff: Period["cutoff"]
): number =>
  hourly(hash, field).reduce((sum, count, hour) => {
    if (!cutoff || hour < cutoff.hour) {
      return sum + count
    }
    if (hour === cutoff.hour) {
      return sum + (count * cutoff.minute) / 60
    }
    return sum
  }, 0)

/**
 * Totals over a period's days. `applyCutoff` is for the comparison period
 * only: the current one has no data past now anyway, and pro-rating its
 * current hour would throw away beacons that did arrive.
 */
const periodTotals = (
  hashes: Record<string, string>[],
  cutoff: Period["cutoff"]
): Totals => {
  const totals = emptyTotals()
  hashes.forEach((hash, i) => {
    const cut = i === hashes.length - 1 ? cutoff : null
    for (const name of METRIC_NAMES) {
      totals[name] += dayTotal(hash, METRICS[name], cut)
    }
  })
  for (const name of METRIC_NAMES) {
    totals[name] = Math.round(totals[name])
  }
  return totals
}

const seriesOf = (
  period: Period,
  hashes: Record<string, string>[],
  granularity: Granularity,
  lastHour: number | null
): Series => {
  const buckets = bucketsFor(period, granularity)

  if (granularity === "hour") {
    const hash = hashes[0] ?? {}
    const future = (hour: number) => lastHour !== null && hour > lastHour
    return {
      buckets,
      sessions: hourly(hash, METRICS.sessions).map((v, h) => (future(h) ? null : v)),
      pageviews: hourly(hash, METRICS.pageviews).map((v, h) => (future(h) ? null : v)),
    }
  }

  const index = new Map(buckets.map((bucket, i) => [bucket, i]))
  const sessions = buckets.map(() => 0)
  const pageviews = buckets.map(() => 0)

  period.days.forEach((day, i) => {
    const at = index.get(bucketOfDay(day, granularity))
    if (at === undefined) {
      return
    }
    sessions[at] += dayTotal(hashes[i], METRICS.sessions, null)
    pageviews[at] += dayTotal(hashes[i], METRICS.pageviews, null)
  })

  return { buckets, sessions, pageviews }
}

/** Sums same-named fields across days, largest first. */
const rank = (
  hashes: Record<string, string>[],
  limit: number,
  prefix = ""
): Ranked[] => {
  const sums = new Map<string, number>()
  for (const hash of hashes) {
    for (const [field, value] of Object.entries(hash)) {
      if (!field.startsWith(prefix)) {
        continue
      }
      const key = field.slice(prefix.length)
      sums.set(key, (sums.get(key) ?? 0) + Number(value))
    }
  }
  return [...sums.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit)
}

const toLiveVisitor = (
  id: string,
  lastSeenAt: number,
  hash: Record<string, string>
): LiveVisitor => ({
  id,
  path: hash.path ?? "/",
  page_type: (hash.type as PageType) ?? "other",
  handle: hash.handle || null,
  device: hash.device ?? "desktop",
  country: hash.country || null,
  city: hash.city || null,
  source: hash.source ?? "directo",
  landing: hash.landing || null,
  started_at: Number(hash.start ?? lastSeenAt),
  last_seen_at: lastSeenAt,
  pages: Number(hash.pages ?? 0),
  has_cart: hash.cart === "1",
  logged_in: hash.auth === "1",
  added_to_cart: hash[`f:${METRICS.added_to_cart}`] === "1",
  reached_checkout: hash[`f:${METRICS.reached_checkout}`] === "1",
  contacted_whatsapp: hash[`f:${METRICS.contacted_whatsapp}`] === "1",
  purchased: hash[`f:${METRICS.purchased}`] === "1",
})

export const createTrafficStore = (
  client: TrafficClient,
  { maxSessions = MAX_TRACKED_SESSIONS }: { maxSessions?: number } = {}
) => ({
  /**
   * Records one beacon. Resolves to false when it was dropped because the
   * session cap is reached. Throws on a Redis failure; the caller decides that
   * a lost beacon is not worth an error page.
   */
  async record(event: TrafficEvent, now: number = Date.now()): Promise<boolean> {
    const sessionKey = KEYS.session(event.sessionId)

    if (event.type === "leave") {
      // Out of the live list at once. The session itself stays, so coming
      // back within half an hour continues it instead of starting another.
      await withDeadline(
        client.batch().zrem(KEYS.live, event.sessionId).exec(),
        WRITE_DEADLINE_MS
      )
      return true
    }

    const [tracked, known] = await withDeadline(
      client.batch().zcard(KEYS.live).exists(sessionKey).exec(),
      WRITE_DEADLINE_MS
    )
    if (!known && Number(tracked) >= maxSessions) {
      return false
    }

    const day = dayKey(now)
    const hour = hourKey(now)
    const milestone = milestoneFor(event)

    // Replies 0 and 1 are read below: whether this event opened the session,
    // and whether it is the session's first time reaching `milestone`.
    const session = client.batch().hsetnx(sessionKey, "day", day)
    if (milestone) {
      session.hsetnx(sessionKey, `f:${milestone}`, "1")
    }
    session
      // Set once, by the event that opens the session: later beacons carry no
      // referrer, so letting them overwrite would turn every session "directo".
      .hsetnx(sessionKey, "start", String(now))
      .hsetnx(sessionKey, "source", event.source)
      .hsetnx(sessionKey, "landing", event.page.path)
      .hset(sessionKey, {
        path: event.page.path,
        type: event.page.type,
        handle: event.page.handle ?? "",
        device: event.device,
        country: event.country ?? "",
        city: event.city ?? "",
        cart: event.hasCart ? "1" : "0",
        auth: event.loggedIn ? "1" : "0",
      })
    if (event.type === "pageview") {
      session.hincrby(sessionKey, "pages", 1)
    }
    session
      .expire(sessionKey, SESSION_IDLE_SECONDS)
      .zadd(KEYS.live, now, event.sessionId)
      .zremrangebyscore(KEYS.live, now - LIVE_INDEX_RETENTION_MS)

    const replies = await withDeadline(session.exec(), WRITE_DEADLINE_MS)
    const newSession = Number(replies[0]) === 1
    const newMilestone = milestone !== null && Number(replies[1]) === 1

    const counters = client.batch()
    const touched = new Set<string>([KEYS.day(day)])
    const count = (field: MetricField) =>
      counters.hincrby(KEYS.day(day), `${field}:${hour}`, 1)
    const countCapped = (key: string, field: string, cap: number) => {
      touched.add(key)
      counters.hincrcap(key, field, cap, OVERFLOW_FIELD)
    }

    if (newSession) {
      count(METRICS.sessions)

      const breakdown = KEYS.breakdown(day)
      touched.add(breakdown).add(KEYS.visitors(day))
      counters
        .hincrby(breakdown, `device:${event.device}`, 1)
        .hincrby(breakdown, `source:${event.source}`, 1)
        .hincrby(breakdown, `visitor:${event.newVisitor ? "new" : "returning"}`, 1)
        .pfadd(KEYS.visitors(day), event.visitorId)
      if (event.country) {
        counters.hincrby(breakdown, `country:${event.country}`, 1)
      }
      if (event.city) {
        countCapped(
          KEYS.cities(day),
          `${event.country ?? "--"}|${event.city}`,
          CAPS.cities
        )
      }
      countCapped(KEYS.landing(day), event.page.path, CAPS.landing)
    }

    if (event.type === "pageview") {
      count(METRICS.pageviews)
      if (event.page.type === "product") {
        count(METRICS.product_views)
      }
      countCapped(KEYS.pages(day), event.page.path, CAPS.pages)
    }

    if (event.type === "whatsapp") {
      count(METRICS.whatsapp_clicks)
      countCapped(KEYS.whatsapp(day), event.page.path, CAPS.whatsapp)
    }

    if (newMilestone) {
      count(milestone!)
    }

    for (const key of touched) {
      counters.expire(key, DAY_TTL_SECONDS)
    }

    await withDeadline(counters.exec(), WRITE_DEADLINE_MS)
    return true
  },

  /** Who is on the site right now, plus today's running totals. */
  async live(now: number = Date.now(), limit = 50): Promise<LiveSnapshot> {
    const [, active, recent, members, today] = await withDeadline(
      client
        .batch()
        .zremrangebyscore(KEYS.live, now - LIVE_INDEX_RETENTION_MS)
        .zcount(KEYS.live, now - LIVE_WINDOW_MS)
        .zcount(KEYS.live, now - RECENT_WINDOW_MS)
        .zrecent(KEYS.live, now - LIVE_WINDOW_MS, limit)
        .hgetall(KEYS.day(dayKey(now)))
        .exec(),
      READ_DEADLINE_MS
    )

    const pairs = members as [string, number][]
    const details = client.batch()
    pairs.forEach(([sid]) => details.hgetall(KEYS.session(sid)))
    const hashes = pairs.length
      ? ((await withDeadline(details.exec(), READ_DEADLINE_MS)) as Record<
          string,
          string
        >[])
      : []

    const visitors: LiveVisitor[] = []
    pairs.forEach(([sid, lastSeenAt], i) => {
      // A session whose hash expired between the two reads has nothing to
      // show; it drops off the index on its own.
      if (Object.keys(hashes[i] ?? {}).length > 0) {
        visitors.push(toLiveVisitor(sid, lastSeenAt, hashes[i]))
      }
    })

    return {
      active: Number(active),
      recent: Number(recent),
      visitors,
      today: periodTotals([today as Record<string, string>], null),
    }
  },

  /** Totals, series and breakdowns for a period and its comparison period. */
  async report(
    current: Period,
    previous: Period,
    granularity: Granularity,
    now: number = Date.now()
  ): Promise<TrafficReport> {
    const batch = client.batch()
    current.days.forEach((day) => batch.hgetall(KEYS.day(day)))
    previous.days.forEach((day) => batch.hgetall(KEYS.day(day)))
    current.days.forEach((day) =>
      batch
        .hgetall(KEYS.breakdown(day))
        .hgetall(KEYS.pages(day))
        .hgetall(KEYS.landing(day))
        .hgetall(KEYS.whatsapp(day))
        .hgetall(KEYS.cities(day))
    )
    batch.pfcount(current.days.map(KEYS.visitors))
    batch.pfcount(previous.days.map(KEYS.visitors))

    const replies = await withDeadline(batch.exec(), READ_DEADLINE_MS)

    let at = 0
    const take = (n: number) => {
      const slice = replies.slice(at, at + n) as Record<string, string>[]
      at += n
      return slice
    }

    const currentDays = take(current.days.length)
    const previousDays = take(previous.days.length)
    const perDay = take(current.days.length * 5)
    const [currentVisitors, previousVisitors] = replies.slice(at) as number[]

    const column = (offset: number) => perDay.filter((_, i) => i % 5 === offset)
    const breakdowns = column(0)

    const visitorTypes = rank(breakdowns, 2, "visitor:")
    const visitorCount = (key: string) =>
      visitorTypes.find((v) => v.key === key)?.count ?? 0

    const lastHour =
      current.to === dayKey(now) ? Number(hourKey(now)) : null

    return {
      totals: {
        ...periodTotals(currentDays, null),
        visitors: Number(currentVisitors),
        new_visitors: visitorCount("new"),
        returning_visitors: visitorCount("returning"),
      },
      previous: {
        ...periodTotals(previousDays, previous.cutoff),
        visitors: Number(previousVisitors),
      },
      series: {
        current: seriesOf(current, currentDays, granularity, lastHour),
        previous: seriesOf(previous, previousDays, granularity, null),
      },
      devices: rank(breakdowns, 3, "device:"),
      sources: rank(breakdowns, 12, "source:"),
      countries: rank(breakdowns, 8, "country:"),
      cities: rank(column(4), 10),
      pages: rank(column(1), 300),
      landing_pages: rank(column(2), 10),
      whatsapp_pages: rank(column(3), 10),
    }
  },
})

export type TrafficStore = ReturnType<typeof createTrafficStore>

let shared: { store: TrafficStore; backend: "redis" | "memory" } | undefined

/**
 * Redis when `REDIS_URL` is set, so every server instance sees the same
 * visitors; an in-process store otherwise, which is only right for local
 * development. Created on first use, so importing this costs nothing.
 */
export const sharedTraffic = () => {
  if (!shared) {
    const url = process.env.REDIS_URL
    shared = url
      ? { store: createTrafficStore(redisTrafficClient(url)), backend: "redis" }
      : { store: createTrafficStore(memoryTrafficClient()), backend: "memory" }
  }
  return shared
}
