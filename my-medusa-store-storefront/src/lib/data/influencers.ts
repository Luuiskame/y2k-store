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
  /** Which collection this specific shot belongs to. */
  collectionHandles?: string[]
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
  /** Products this creator is tied to. Empty + empty collections = everywhere. */
  productHandles: string[]
  /** Collections this creator is tied to. */
  collectionHandles: string[]
  featured?: boolean
  order?: number
}

/** What a product page is asking for. A product has at most one collection. */
export type ProductTargeting = {
  productHandle?: string | null
  collectionHandle?: string | null
}

/**
 * A face in the trust bar. Creators supply their own; plain clients who tagged
 * us come from the feed's optional top-level `clients` list.
 */
export type ProofFace = {
  key: string
  name: string
  avatar?: string
  /** Creators we have an actual collab with; plain clients are never marked. */
  verified?: boolean
}

export type CreatorSelection = {
  items: Influencer[]
  /** true = at least one shown creator is tied to *this* exact product. */
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
    collectionHandles: asHandles(input.collectionHandles),
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
    collectionHandles: asHandles(input.collectionHandles),
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

/* ---------- targeting ------------------------------------------------------
 *
 * Three tiers, best first. Anything tied to *other* products or collections is
 * excluded outright:
 *
 *   1  tied to this exact product
 *   2  tied to this product's collection
 *   3  tied to nothing at all → appears on every product
 *
 * Leaving both handle lists empty in the feed is therefore the "show this
 * creator everywhere" switch. */

const TIER_PRODUCT = 1
const TIER_COLLECTION = 2
const TIER_UNTARGETED = 3

const tierFor = (
  productHandles: string[],
  collectionHandles: string[],
  target: ProductTargeting
): number | null => {
  if (target.productHandle && productHandles.includes(target.productHandle)) {
    return TIER_PRODUCT
  }
  if (
    target.collectionHandle &&
    collectionHandles.includes(target.collectionHandle)
  ) {
    return TIER_COLLECTION
  }
  if (!productHandles.length && !collectionHandles.length) {
    return TIER_UNTARGETED
  }
  return null
}

/**
 * Media for this product: shots tagged for it when there are any, otherwise the
 * creator's untagged shots. Shots tagged for a *different* product never leak
 * through.
 */
const narrowMedia = (
  media: InfluencerMedia[],
  target: ProductTargeting
): InfluencerMedia[] => {
  const withTier = media
    .map((item) => ({
      item,
      tier: tierFor(
        item.productHandles ?? [],
        item.collectionHandles ?? [],
        target
      ),
    }))
    .filter((entry) => entry.tier !== null)

  const explicit = withTier.filter((entry) => entry.tier !== TIER_UNTARGETED)
  const chosen = explicit.length ? explicit : withTier

  return chosen.map((entry) => entry.item)
}

/**
 * Creators to show on a product page, best-targeted first.
 *
 * `limit` caps creators, not tiles — the caller decides how many tiles to draw.
 * `onlyVideo` drops creators with no clip *before* the cap, so an image-only
 * creator can't occupy a slot on a video-only wall.
 */
export const listInfluencersForProduct = async (
  target: ProductTargeting = {},
  options: { limit?: number; onlyVideo?: boolean } = {}
): Promise<CreatorSelection> => {
  const { limit = 3, onlyVideo = false } = options
  const all = await listInfluencers()

  if (!all.length) {
    return { items: [], matched: false }
  }

  const scored = all
    .map((influencer) => {
      const tier = tierFor(
        influencer.productHandles,
        influencer.collectionHandles,
        target
      )

      if (tier === null) {
        return null
      }

      const media = narrowMedia(influencer.media, target).filter(
        (item) => !onlyVideo || item.type === "video"
      )

      return media.length ? { influencer: { ...influencer, media }, tier } : null
    })
    .filter(
      (entry): entry is { influencer: Influencer; tier: number } =>
        entry !== null
    )

  // Stable sort, so the feed's own `order` survives inside each tier.
  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(Boolean(b.influencer.featured)) -
        Number(Boolean(a.influencer.featured))
  )

  const shown = scored.slice(0, limit)

  return {
    items: shown.map((entry) => entry.influencer),
    matched: shown.some((entry) => entry.tier === TIER_PRODUCT),
  }
}

/* ---------- trust-bar faces ------------------------------------------------ */

/** First name + last name, trimmed to two words. "maria" → "Maria". */
const toDisplayName = (raw: string): string =>
  raw
    .split(/\s+/)
    .slice(0, 2)
    .map((word) =>
      word.length > 1
        ? word[0].toLocaleUpperCase("es") + word.slice(1)
        : word.toLocaleUpperCase("es")
    )
    .join(" ")

/**
 * Plain clients who tagged us — read from an optional top-level `clients` array
 * in the feed. A bare array feed (what we have today) simply yields none.
 */
const normalizeClients = (raw: unknown): ProofFace[] => {
  const list = Array.isArray((raw as Record<string, unknown>)?.clients)
    ? ((raw as Record<string, unknown>).clients as unknown[])
    : []

  return list
    .map((entry, index): ProofFace | null => {
      const input = (entry && typeof entry === "object" ? entry : {}) as Record<
        string,
        unknown
      >
      const name = asText(input.name)
      return name
        ? {
            key: asText(input.slug) || `client-${index}`,
            name: toDisplayName(name),
            avatar: asUrl(input.avatar),
          }
        : null
    })
    .filter((face): face is ProofFace => face !== null)
}

const fetchClients = async (): Promise<ProofFace[]> => {
  try {
    const res = await fetch(FEED_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
    })
    return res.ok ? normalizeClients(await res.json()) : []
  } catch {
    return []
  }
}

/**
 * Faces for the trust bar: named creators first (they carry the most weight),
 * then tagged clients. Names are de-duplicated so two "Maria"s don't both show
 * — repeated first names read as filler rather than proof.
 */
export const listProofFaces = async (limit = 5): Promise<ProofFace[]> => {
  const [influencers, clients] = await Promise.all([
    listInfluencers(),
    fetchClients(),
  ])

  // Creators carry the badge; clients from the feed deliberately do not.
  const creatorFaces: ProofFace[] = influencers.map((influencer) => ({
    key: influencer.slug,
    name: toDisplayName(influencer.name),
    avatar: influencer.avatar,
    verified: true,
  }))

  const seen = new Set<string>()

  return [...creatorFaces, ...clients]
    .filter((face) => {
      const key = face.name.toLocaleLowerCase("es")
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
    .slice(0, limit)
}
