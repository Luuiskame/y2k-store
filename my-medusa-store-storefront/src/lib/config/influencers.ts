import type { Influencer } from "@lib/data/influencers"

/* Last-resort influencer data, bundled with the build.
 *
 * The live list lives in R2 (`content/influencers.json`) and is edited from the
 * Cloudflare dashboard. This file is only read when that fetch fails or the
 * file can't be parsed — so an R2 outage or a stray comma degrades to "no
 * section" instead of a broken product page.
 *
 * Empty is the correct default: showing nothing beats showing stale collabs.
 * If you ever want a safety net, paste the last known-good contents of
 * influencers.json here — the shape is identical.
 */
export const INFLUENCERS_FALLBACK: Influencer[] = []
