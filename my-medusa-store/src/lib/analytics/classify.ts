/**
 * Turns what a visitor's browser reports into the small, bounded vocabulary
 * the traffic counters are keyed on.
 *
 * Everything here ends up inside a Redis key or field and later on the admin
 * dashboard, and all of it arrives from an unauthenticated endpoint. So each
 * function accepts anything and returns either one of a fixed set of values or
 * a string that has been shortened and stripped to a safe alphabet. Nothing a
 * caller sends reaches Redis verbatim.
 */

export const PAGE_TYPES = [
  "home",
  "product",
  "category",
  "collection",
  "catalog",
  "cart",
  "checkout",
  "purchase",
  "account",
  "info",
  "other",
] as const

export type PageType = (typeof PAGE_TYPES)[number]

export type NormalizedPage = {
  /** Country prefix, query string and ids removed: `/products/camiseta-cruz`. */
  path: string
  type: PageType
  /** Product handle, on product pages only. */
  handle: string | null
}

const MAX_SEGMENTS = 4
const MAX_SEGMENT_LENGTH = 80

/** Handles, category slugs and page names: lowercase, digits, `-`, `_`. */
const SLUG = /^[a-z0-9][a-z0-9_-]*$/

const INFO_PAGES = new Set([
  "envios",
  "guia-de-tallas",
  "preguntas-frecuentes",
  "sobre-nosotros",
  "colaboraciones",
  "reset-password",
])

const OTHER: NormalizedPage = { path: "/otra", type: "other", handle: null }

/**
 * `/hn/order/order_01J.../confirmed?x=1` becomes `/order/:id/confirmed`.
 *
 * Order ids and transfer tokens are masked: they would give every order its
 * own key, and a token in a dashboard is a token someone can copy. The country
 * prefix goes too — the shop sells in one country, and keeping it would split
 * every page in two if a second region ever appears.
 */
export const normalizePage = (raw: unknown): NormalizedPage => {
  if (typeof raw !== "string" || !raw.startsWith("/")) {
    return OTHER
  }

  const pathname = raw.slice(0, 300).split(/[?#]/)[0].toLowerCase()

  let segments = pathname.split("/").filter(Boolean)
  if (segments[0] && /^[a-z]{2}$/.test(segments[0])) {
    segments = segments.slice(1)
  }

  if (segments.length === 0) {
    return { path: "/", type: "home", handle: null }
  }

  const [first, second, third] = segments

  if (first === "order" && second) {
    if (third === "confirmed" || third === "transferencia-bac") {
      return { path: `/order/:id/${third}`, type: "purchase", handle: null }
    }
    return { path: "/order/:id", type: "account", handle: null }
  }

  if (first === "account") {
    if (second === "orders" && third === "details") {
      return { path: "/account/orders/details/:id", type: "account", handle: null }
    }
    const tail = segments.slice(1, 2).filter((s) => SLUG.test(s))
    return {
      path: ["/account", ...tail].join("/"),
      type: "account",
      handle: null,
    }
  }

  if (
    segments.length > MAX_SEGMENTS ||
    segments.some((s) => s.length > MAX_SEGMENT_LENGTH || !SLUG.test(s))
  ) {
    return OTHER
  }

  const path = `/${segments.join("/")}`

  switch (first) {
    case "products":
      return second && segments.length === 2
        ? { path, type: "product", handle: second }
        : OTHER
    case "categories":
      return segments.length >= 2
        ? { path, type: "category", handle: null }
        : OTHER
    case "collections":
      return second && segments.length === 2
        ? { path, type: "collection", handle: null }
        : OTHER
    case "store":
      return segments.length === 1
        ? { path, type: "catalog", handle: null }
        : OTHER
    case "cart":
      return segments.length === 1 ? { path, type: "cart", handle: null } : OTHER
    case "checkout":
      return segments.length === 1
        ? { path, type: "checkout", handle: null }
        : OTHER
  }

  if (segments.length === 1 && INFO_PAGES.has(first)) {
    return { path, type: "info", handle: null }
  }

  return { path, type: "other", handle: null }
}

export const SOURCES = [
  "instagram",
  "facebook",
  "meta",
  "tiktok",
  "whatsapp",
  "google",
  "youtube",
  "x",
  "buscadores",
  "email",
  "otro",
  "directo",
] as const

export type Source = (typeof SOURCES)[number]

/**
 * `utm_source` values, matched loosely: Instagram's own "copy link" writes
 * `ig_web_copy_link`, people type `Instagram` or `IG`, and all of those are
 * the same place.
 */
const UTM_SOURCES: [RegExp, Source][] = [
  [/^ig($|_)|instagram/, "instagram"],
  [/^fb($|_)|facebook|messenger/, "facebook"],
  [/^meta$/, "meta"],
  [/tiktok|^tt$/, "tiktok"],
  [/whatsapp|^wa$/, "whatsapp"],
  [/google/, "google"],
  [/youtube|^yt$/, "youtube"],
  [/twitter|^x$/, "x"],
  [/mail|newsletter/, "email"],
]

/**
 * Click-id and share parameters the storefront reports by name (never the
 * value). `igsh` is on links shared from the Instagram app, `mibextid` on
 * links shared from Facebook's.
 */
export const CLICK_IDS = ["gclid", "ttclid", "fbclid", "igsh", "mibextid"] as const

const CLICK_ID_SOURCES: Record<string, Source> = {
  gclid: "google",
  ttclid: "tiktok",
  igsh: "instagram",
  mibextid: "facebook",
}

/** Host suffix → source. Checked in order; the first match wins. */
const REFERRER_HOSTS: [RegExp, Source][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
  [/(^|\.)(tiktok\.com)$/, "tiktok"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "x"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/^com\.google\.android\.googlequicksearchbox$/, "google"],
  [/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|yandex\.[a-z]+|search\.brave\.com)$/, "buscadores"],
  [/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|mail\.yahoo\.com)$/, "email"],
]

const hostOf = (referrer: string): string | null => {
  try {
    // `android-app://com.google.android.googlequicksearchbox/` is what Chrome
    // on Android reports for the Google app.
    return new URL(referrer).hostname.toLowerCase() || null
  } catch {
    return null
  }
}

export type SourceInput = {
  referrer?: unknown
  utmSource?: unknown
  /** Which click-id parameter the landing URL carried, if any. */
  clickId?: unknown
  userAgent?: unknown
}

/**
 * Where a session came from, in the order of how much each signal can be
 * trusted to be what it says:
 *
 * 1. `utm_source`, which the owner puts on links they share on purpose.
 * 2. The in-app browser. Instagram, Facebook and TikTok open links inside
 *    their own apps, and those usually send no referrer at all — without this,
 *    most social traffic would show up as "directo". The app names itself in
 *    the user agent.
 * 3. A click id or share parameter (`gclid`, `ttclid`, `igsh`, `mibextid`,
 *    `fbclid`). `fbclid` is added by Facebook and Instagram alike, so unless
 *    the referrer says which, it only says "Meta".
 * 4. The referrer's host.
 */
export const classifySource = ({
  referrer,
  utmSource,
  clickId,
  userAgent,
}: SourceInput): Source => {
  if (typeof utmSource === "string") {
    const key = utmSource.trim().toLowerCase()
    if (key) {
      return UTM_SOURCES.find(([pattern]) => pattern.test(key))?.[1] ?? "otro"
    }
  }

  const ua = typeof userAgent === "string" ? userAgent : ""
  if (/Instagram/.test(ua)) {
    return "instagram"
  }
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua)) {
    return "facebook"
  }
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) {
    return "tiktok"
  }

  const host = typeof referrer === "string" ? hostOf(referrer) : null

  if (typeof clickId === "string" && CLICK_ID_SOURCES[clickId]) {
    return CLICK_ID_SOURCES[clickId]
  }
  if (clickId === "fbclid") {
    if (host && /(^|\.)instagram\.com$/.test(host)) {
      return "instagram"
    }
    if (host && /(^|\.)(facebook\.com|fb\.com)$/.test(host)) {
      return "facebook"
    }
    return "meta"
  }

  if (!host) {
    return "directo"
  }

  for (const [pattern, source] of REFERRER_HOSTS) {
    if (pattern.test(host)) {
      return source
    }
  }

  return "otro"
}

export const DEVICES = ["mobile", "tablet", "desktop"] as const

export type Device = (typeof DEVICES)[number]

export const classifyDevice = (userAgent: unknown): Device => {
  const ua = typeof userAgent === "string" ? userAgent : ""

  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || /Android(?!.*Mobile)/i.test(ua)) {
    return "tablet"
  }

  if (/Mobi|iPhone|iPod|Android|Windows Phone|IEMobile|Opera Mini/i.test(ua)) {
    return "mobile"
  }

  return "desktop"
}

/**
 * Crawlers, link-preview fetchers, monitors and scripts. Most never run the
 * page's JavaScript, but Googlebot and the headless renderers do, and a
 * preview fetch that does would be counted as a visit that lasted one second.
 *
 * WhatsApp is in here on purpose: it has no in-app browser, so a request
 * naming WhatsApp is the link preview being built, not a person.
 *
 * "bot" only counts as a whole word or as a crawler name followed by its
 * version (`Googlebot/2.1`, `AdsBot-Google`, `PetalBot;`). A bare substring
 * would also catch the CUBOT phones sold across Latin America.
 */
const BOT_PATTERN =
  /\bbot\b|[a-z]bot[/;-]|[a-z]bot$|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|mediapartners|google-inspectiontool|googleother|apis-google|lighthouse|headlesschrome|phantomjs|bingpreview|whatsapp|telegram|skypeuripreview|embedly|pingdom|uptime|monitor|curl\/|wget\/|python-|axios\/|node-fetch|undici|go-http-client|okhttp|java\//i

export const isBot = (userAgent: unknown): boolean => {
  if (typeof userAgent !== "string" || userAgent.trim().length < 10) {
    // Every real browser sends a long user agent. An empty or stub one is a
    // script.
    return true
  }
  return BOT_PATTERN.test(userAgent)
}

/** ISO 3166-1 alpha-2, as Vercel's `x-vercel-ip-country` sends it. */
export const normalizeCountry = (value: unknown): string | null =>
  typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : null

/**
 * City names from Vercel's geolocation, already URL-decoded by the storefront.
 * Letters in any script, spaces, dots, apostrophes and hyphens; anything else
 * means it is not a city name.
 */
export const normalizeCity = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }
  const city = value.trim().replace(/\s+/g, " ").slice(0, 60)
  return city && /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(city) ? city : null
}
