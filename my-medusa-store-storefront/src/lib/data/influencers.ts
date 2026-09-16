import "server-only"

import { INFLUENCERS_FALLBACK } from "@lib/config/influencers"

/* Influencer / collab content.
 *
 * Source of truth is a JSON file in the R2 bucket, edited by hand in the
 * Cloudflare dashboard — no database, no admin panel. See
 * `docs/influencers-plan.md` (Option B) for why.
 *
 * The feed is hand-edited, so it *will* be malformed at some point. Nothing in
 * here throws: bad entries are dropped, a bad fetch falls back to
 * `lib/config/influencers`, and an empty result renders no section at all. A
 * content typo must never take down a product page.
 */

export type InfluencerPlatform = "tiktok" | "instagram" | "facebook" | "youtube"

export type InfluencerSocial = {
  platform: InfluencerPlatform
  handle: string
  url: string
  /** Entered by hand in the feed; hidden below SOCIAL_FOLLOWER_THRESHOLD. */
  followers?: number
}

export type InfluencerMedia = {
  type: "image" | "video"
  url: string
  /** Required in practice for videos — the frame shown before playback. */
  poster?: string
  alt: string
  /** TikTok / IG permalink. When present the tile links out to the real post. */
  postUrl?: string
  /** Which product this specific shot shows. */
  productHandles?: string[]
}

export type Influencer = {
  slug: string
  name: string
  city?: string
  tagline?: string
  story?: string
  avatar?: string
  socials: InfluencerSocial[]
  media: InfluencerMedia[]
  productHandles: string[]
  featured?: boolean
  order?: number
}

export type CreatorSelection = {
  items: Influencer[]
  /** true = these creators wore *this* product; false = generic brand collabs. */
  matched: boolean
}

const FEED_URL =
  process.env.INFLUENCERS_FEED_URL ||
  "https://media.y2kfithn.com/y2k-fit-store-hn/content/influencers.json"

/** Matches the PDP's own `revalidate`, so the two refresh in step. */
const REVALIDATE_SECONDS = 600

const PLATFORMS: InfluencerPlatform[] = [
  "tiktok",
  "instagram",
  "facebook",
  "youtube",
]

/* ---------- coercion helpers: every one returns undefined, never throws ---- */

/** Seed entries use "..." as a stand-in for copy that isn't written yet. */
const isPlaceholder = (value: string) => /^[.\s…-]*$/.test(value)

const asText = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }
  const trimmed = value.trim()
  return !trimmed || isPlaceholder(trimmed) ? undefined : trimmed
}

/** Absolute http(s) only — keeps `javascript:` out of an href we render. */
const asUrl = (value: unknown): string | undefined => {
  const text = asText(value)
  if (!text) {
    return undefined
  }
  try {
    const { protocol } = new URL(text)
    return protocol === "http:" || protocol === "https:" ? text : undefined
  } catch {
    return undefined
  }
}

const asHandles = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(asText).filter((h): h is string => Boolean(h))
    : []

const asFollowers = (value: unknown): number | undefined => {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

/* ---------- normalization ------------------------------------------------- */

const normalizeSocial = (raw: unknown): InfluencerSocial | null => {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const input = raw as Record<string, unknown>

  const platform = asText(input.platform)?.toLowerCase()
  const url = asUrl(input.url)

  if (!platform || !PLATFORMS.includes(platform as InfluencerPlatform) || !url) {
    return null
  }

  return {
    platform: platform as InfluencerPlatform,
    handle: asText(input.handle) || "",
    url,
    followers: asFollowers(input.followers),
  }
}

const normalizeMedia = (
  raw: unknown,
  influencerName: string
): InfluencerMedia | null => {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const input = raw as Record<string, unknown>

  const url = asUrl(input.url)
  if (!url) {
    return null
  }

  const type = asText(input.type)?.toLowerCase() === "video" ? "video" : "image"

  return {
    type,
    url,
    poster: asUrl(input.poster),
    // Alt text is an accessibility requirement, not optional content — fall
    // back to something descriptive rather than shipping an empty alt.
    alt: asText(input.alt) || `${influencerName} con Y2K Fit`,
    postUrl: asUrl(input.postUrl),
    productHandles: asHandles(input.productHandles),
  }
}

const normalizeInfluencer = (raw: unknown): Influencer | null => {
  if (!raw || typeof raw !== "object") {
    return null
  }
  const input = raw as Record<string, unknown>

  const slug = asText(input.slug)
  const name = asText(input.name) || slug

  // Without a slug there's no stable key and no way to reference the record.
  if (!slug || !name) {
    return null
  }

  const order = asFollowers(input.order)

  return {
    slug,
    name,
    city: asText(input.city),
    tagline: asText(input.tagline),
    story: asText(input.story),
    avatar: asUrl(input.avatar),
    socials: Array.isArray(input.socials)
      ? input.socials
          .map(normalizeSocial)
          .filter((s): s is InfluencerSocial => s !== null)
      : [],
    media: Array.isArray(input.media)
      ? input.media
          .map((m) => normalizeMedia(m, name))
          .filter((m): m is InfluencerMedia => m !== null)
      : [],
    productHandles: asHandles(input.productHandles),
    featured: input.featured === true,
    order,
  }
}

const normalizeFeed = (raw: unknown): Influencer[] => {
  // Accept a bare array or `{ influencers: [...] }` so wrapping the file later
  // doesn't break the storefront.
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown>)?.influencers)
    ? ((raw as Record<string, unknown>).influencers as unknown[])
    : []

  const seen = new Set<string>()

  return list
    .map(normalizeInfluencer)
    .filter((i): i is Influencer => i !== null)
    .filter((i) => {
      if (seen.has(i.slug)) {
        return false
      }
      seen.add(i.slug)
      return true
    })
    .sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
      return aOrder - bOrder || a.name.localeCompare(b.name)
    })
}

/* ---------- public API ---------------------------------------------------- */

/**
 * Every influencer in the feed, ordered. Falls back to the bundled config when
 * R2 is unreachable or the file is unusable.
 */
export const listInfluencers = async (): Promise<Influencer[]> => {
  try {
    const res = await fetch(FEED_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!res.ok) {
      throw new Error(`feed responded ${res.status}`)
    }

    const parsed = normalizeFeed(await res.json())

    // An empty parse means the file is there but unusable (or deliberately
    // emptied). Either way the bundled fallback is the safer answer.
    return parsed.length ? parsed : INFLUENCERS_FALLBACK
  } catch (error) {
    console.warn(
      `[influencers] falling back to bundled config: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    )
    return INFLUENCERS_FALLBACK
  }
}

/** Keeps only the media tagged for this product, when any is. */
const narrowToProduct = (
  influencer: Influencer,
  handle: string
): Influencer | null => {
  const taggedMedia = influencer.media.filter((m) =>
    m.productHandles?.includes(handle)
  )

  if (taggedMedia.length) {
    return { ...influencer, media: taggedMedia }
  }

  // Wore the product but didn't tag individual shots — show what they have.
  return influencer.productHandles.includes(handle) ? influencer : null
}

/**
 * Creators to show on a product page. Prefers people who actually wore this
 * product; falls back to featured collabs so a new product still carries proof
 * that the brand has collabs at all.
 */
export const listInfluencersForProduct = async (
  handle?: string | null,
  limit = 6
): Promise<CreatorSelection> => {
  const all = await listInfluencers()

  if (!all.length) {
    return { items: [], matched: false }
  }

  if (handle) {
    const matches = all
      .map((influencer) => narrowToProduct(influencer, handle))
      .filter((influencer): influencer is Influencer => influencer !== null)

    if (matches.length) {
      return { items: matches.slice(0, limit), matched: true }
    }
  }

  const featured = all.filter((influencer) => influencer.featured)
  const pool = featured.length ? featured : all

  return { items: pool.slice(0, Math.min(limit, 3)), matched: false }
}
