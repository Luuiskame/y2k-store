# Influencers / Colaboraciones — Plan

> Extends `product-page-trust-plan.md` §3.5 ("Cómo se ve puesto" UGC wall), which was deferred because no worn-product content existed. It does now — via collabs. This doc replaces that section with a concrete build.

Goal: show the buyer that **real creators already wear Y2K Fit**, on two surfaces fed by one data source.

---

## 0. The two surfaces

| Surface | Route / file | Content |
|---|---|---|
| **Collabs page** | `src/app/[countryCode]/(main)/colaboraciones/page.tsx` | Full card per influencer: photo, story, socials + follower counts, photo/video strip |
| **PDP section** | `<CreatorWall />` inside `modules/products/templates/index.tsx` | 3–6 tiles filtered to *this* product, right after the trust strip |

PDP insertion point is exact — `templates/index.tsx`, immediately after the trust-strip `</div>` and where `{/* <ReviewsSection /> */}` currently sits (line ~128). That puts it after the founder quote (`FounderStrip`) and after the benefits, as intended.

Route slug: `colaboraciones`, consistent with the site's Spanish routes (`sobre-nosotros`, `guia-de-tallas`, `preguntas-frecuentes`, `envios`). Link it from `modules/layout/templates/nav/index.tsx:77`, `footer/index.tsx:118`, and `side-menu/index.tsx:48` — the three places `sobre-nosotros` already appears.

---

## 1. The decision that matters: one data contract, storage swappable

Before picking where the data lives, freeze the **shape**. Everything else becomes a one-file change later.

`src/lib/data/influencers.ts`:

```ts
export type InfluencerSocial = {
  platform: "tiktok" | "instagram" | "facebook" | "youtube"
  handle: string
  url: string
  followers?: number        // entered by hand; omit when unknown
}

export type InfluencerMedia = {
  type: "image" | "video"
  url: string               // R2 public URL
  poster?: string           // required when type === "video"
  alt: string
  postUrl?: string          // TikTok / IG permalink → tile links out
  productHandles?: string[] // which product this specific shot shows
}

export type Influencer = {
  slug: string
  name: string
  city?: string             // "Tegucigalpa" — same geographic-credibility play as reviews
  tagline: string           // one line, used on the PDP tile
  story: string             // 2–4 sentences, used on the collabs page
  avatar: string
  socials: InfluencerSocial[]
  media: InfluencerMedia[]
  productHandles: string[]  // products they've worn
  featured?: boolean
  order?: number
}

export async function listInfluencers(): Promise<Influencer[]>
export async function listInfluencersForProduct(handle: string): Promise<Influencer[]>
```

Both components import **only these two functions**. Async from day one even when the source is a local file — that's what makes Option A → B → C a single-file migration with no component churn.

Follower rendering reuses what already exists: `SOCIAL_FOLLOWER_THRESHOLD` from `lib/config/brand.ts` and `formatCount` from `modules/products/components/social-anchor`. Counts under 1000 stay hidden — a "340 seguidores" badge argues *against* us. Extract the three SVG icons out of `social-anchor/index.tsx` into `modules/common/icons/social.tsx` so both blocks share them.

---

## 2. Where the data lives — five options

| # | Option | Data lives in | Who edits | Deploy to change? | DB migration | Effort |
|---|---|---|---|---|---|---|
| **A** | TS file in the storefront | git (`lib/config/influencers.ts`) | dev | yes | none | XS |
| **B** | `influencers.json` in the R2 bucket | R2 | anyone with Cloudflare access | no (ISR, ≤10 min) | none | S |
| **C** | Medusa admin page that writes that JSON to R2 | R2 | admin panel form | no | none | M |
| **D** | Custom Medusa module + link to Product | Postgres | admin panel | no | **yes** | L |
| **E** | Influencers as hidden Medusa products | Postgres (existing tables) | admin panel | no | none | M, messy |

### A — TypeScript file in the storefront

Exactly the pattern the codebase already uses for brand follower counts (`lib/config/brand.ts` → `SOCIAL_FOLLOWERS`). Typed, reviewable in a PR, impossible to malform at runtime, zero fetch, zero failure mode. With 3–5 influencers and edits roughly monthly, the cost is one commit per edit.

**Against:** a follower-count tweak needs a deploy.

### B — JSON file sitting in the R2 bucket

Upload `content/influencers.json` to the bucket you already have (exact path and the Cache-Control caveat in §3). `listInfluencers()` becomes:

```ts
// MEDIA_URL = https://media.y2kfithn.com/y2k-fit-store-hn
const res = await fetch(`${MEDIA_URL}/content/influencers.json`, {
  next: { revalidate: 600 },
})
```

The PDP is already `revalidate = 600`, so edits appear within 10 minutes with no build. Editing = drag a file into the Cloudflare dashboard.

**Against:** JSON has no type checking — a trailing comma or a renamed key breaks the section silently. Mitigate with (1) a runtime validator that drops malformed entries instead of throwing, and (2) **keeping the Option-A TS file as the fallback** when the fetch fails or validates empty. The PDP must never break because a content file is bad.

### C — Custom admin page writing that same JSON to R2

A Medusa admin UI route (`src/admin/routes/influencers/page.tsx`) plus an admin API route that reads/writes `content/influencers.json` in R2. Real form, image upload, no Postgres schema touched — this is "modify the admin panel **without** modifying the DB", which is precisely the thing you were asking whether exists. It does.

**Against:** it's a small CMS (form state, array editing, image upload, ordering, concurrent-save handling). Medium effort for a list of five people.

⚠️ If you build C, upload with a direct `S3Client` like `src/api/store/orders/[id]/bac-proof/route.ts` already does — **not** the File module. That file documents the reason: Medusa's s3 provider strips directory paths from filenames (kills the folder layout in §3) and mis-decodes binary as utf8 (corrupts images).

### D — Custom Medusa module

`influencer` data model + module link to `product`, admin widget on the product page, store API route. The textbook answer, and the right one *eventually* — it's what unlocks per-influencer discount codes, attribution, and "which collab drove sales."

**Against:** migrations, a new module, admin UI, a store route, and a storefront fetch — to render a list of five people that changes monthly. Not worth it yet, and you already said you'd rather not touch the DB.

### E — Influencers as hidden/draft Medusa products

Technically works (title = name, description = story, images via the admin uploader, metadata for socials) with zero migrations. **Don't.** It poisons every product query in the store: listings, search, sitemap, related products, collections, feeds, the admin product list. You'd be adding exclusion filters forever. Listed only so it's explicitly rejected.

### Recommendation

> **Ship A this week. Move to B the first time a follower-count edit annoys you — it's a ~20-line change behind `listInfluencers()`. Build C only if someone non-technical takes over the content. Build D when you start paying influencers on performance and need attribution. Never E.**

The follower counts you enter by hand are exactly the kind of data that shouldn't justify a database.

### Worth knowing: the hybrid for product assignment

You can keep the influencer records in code/JSON but decide **which influencer appears on which product** from the Medusa admin today, with no code and no migration — `product.metadata.influencers = "maria,kevin"` in the product's Metadata panel. Free admin control over the part that actually changes per drop.

For v1 the reverse is simpler: keep `productHandles` inside the influencer record (handles are stable, the list is short, and it's type-checked). Metadata is a string field — a typo fails silently. Keep the hybrid in your back pocket for when the catalog grows.

---

## 3. Media pipeline (R2)

R2 is **generic object storage, not an image host** — it holds any file (JSON, MP4, PDF, fonts). The bucket is already wired as Medusa's file provider (`medusa-config.ts` → `file-s3` id `r2`), and `media.y2kfithn.com` is already in `next.config.js` `remotePatterns` — so `next/image` works against these URLs with **no config change**.

### Verified facts about this bucket (probed 2026-09-12)

| Fact | Value |
|---|---|
| Bucket | `y2k-fit-store-hn` |
| Custom domain | `media.y2kfithn.com`, bound at **bucket root** — public URL is `https://media.y2kfithn.com/<key>` |
| Real key prefix of everything the app writes | `y2k-fit-store-hn/…` |
| `R2_FILE_URL` | `https://media.y2kfithn.com/y2k-fit-store-hn` — already includes that prefix |
| Cache-Control served today | `public, max-age=31536000` (one year) |
| Existing top-level prefixes | `y2k-fit-store-hn/` (product images, flat) and `y2k-fit-store-hn/bank-transfers/<orderId>/` (48 files) |

**Why the doubled prefix:** `R2_ENDPOINT` is set to `https://<account>.r2.cloudflarestorage.com/y2k-fit-store-hn` — with the bucket name in the *path*. The S3 client treats that path as a base, so every key gets `y2k-fit-store-hn/` prepended. `R2_FILE_URL` compensates by including the same segment, so the two agree and everything resolves. It's redundant, not broken — **don't "fix" the endpoint without also fixing `R2_FILE_URL`, or every existing product image and BAC proof URL 404s at once.**

Practical consequence: when uploading by hand in the dashboard, put new content **inside the existing `y2k-fit-store-hn/` folder** so that one rule holds everywhere — `public URL = R2_FILE_URL + "/" + path`.

### Layout to create

```
y2k-fit-store-hn/              ← existing folder, upload inside it
  content/
    influencers.json           ← Option B data file
  influencers/
    <slug>/
      avatar.webp
      01-<product-handle>.webp
      clips/
        01.mp4
        01-poster.webp
```

So `https://media.y2kfithn.com/y2k-fit-store-hn/content/influencers.json`.

Put **absolute URLs** in the JSON (paste them from the dashboard's "copy link"). The file is then self-contained and the storefront needs exactly one env var — the JSON location.

### ⚠️ The one thing that will bite you: Cache-Control

Objects here come back with `max-age=31536000`. For images that's ideal — filenames are content-unique, so they're immutable. For `influencers.json` it's fatal: you'd edit the file and the old one would keep being served for up to a year.

When you upload the JSON, **set its Cache-Control explicitly** in the dashboard's HTTP metadata field:

```
public, max-age=60, s-maxage=60
```

Then verify it took:

```bash
curl -sI https://media.y2kfithn.com/y2k-fit-store-hn/content/influencers.json | grep -i cache
```

If it still says a year, a zone-level Cloudflare rule is overriding it — add a Cache Rule scoped to `/y2k-fit-store-hn/content/*` with a short edge TTL, or purge that single URL (Caching → Purge single file) after each edit. Budget one purge click per content edit and this never surprises you.

Two things you do *not* need to worry about:

- **CORS** — Next.js fetches the JSON server-side during ISR, so the browser never requests it.
- **Making files public** — the custom domain serves the whole bucket; anything you drop in is reachable. The flip side: don't put anything in this bucket you wouldn't hand to a stranger who guesses the URL.

Propagation after an edit = Cloudflare cache (controlled above) + Next's `revalidate: 600`. Worst case ~10 minutes. If that ever feels slow, add an `/api/revalidate` route guarded by the `REVALIDATE_SECRET` already sitting unused in `.env.local`.

**Upload paths**, easiest first:

1. Cloudflare R2 dashboard drag-drop — fine for 5 influencers, and the only way to set Cache-Control by hand.
2. `rclone` / `aws s3 cp` with the credentials already in the backend `.env` — best for bulk.
3. `POST /admin/uploads` through Medusa — works for images, but it flattens folders (see caveat above).

**Prep before upload:** square 1:1 crops, 1080px max, WebP, target <200 KB. Today's product images run 230–600 KB, which is heavy for a grid of tiles — the recipes in §4 fix that.

---

## 4. Video — three levels, pick per tile

**L1 — Poster + play badge, links out (recommended default).**
Static poster image in R2, a play triangle overlay, the whole tile is an `<a href={postUrl} target="_blank">` to the TikTok/IG post. Zero JS, zero third-party, matches the dark theme perfectly, no CLS. It communicates "there are videos of this" and sends the buyer to the creator's real profile — which is *better* social proof than an inline player, because they can see the real comment count.

**L2 — Silent looping MP4 from R2 (for 1–2 hero tiles).**
A 3–6s clip, 720p, ~1–2 MB: `muted playsInline loop preload="none"` with a `poster`, started only when scrolled into view using the existing `lib/hooks/use-in-view.tsx` `useIntersection` hook. Click still opens the real post. R2 has no egress fees, so hosting is effectively free. Keep clips tiny — a chunk of this audience is on metered mobile data.

**L3 — Official TikTok / Instagram embeds.**
~500 KB of third-party JS, light-themed iframes that clash with the brand, layout shift, and they're commonly blocked by tracking blockers — a blank hole where your social proof was. Only consider inside a "ver reseña completa" modal, never in the grid.

> Ship L1 everywhere. Add L2 to the two best clips once L1 is live. Skip L3.

### Encoding recipes (ffmpeg)

Not installed on this machine yet. On Windows:

```powershell
winget install Gyan.FFmpeg
```

**Budget per clip: under 1 MB for 5 seconds.** Anything above ~2 MB and you're spending a Honduran buyer's mobile data to show them a loop they didn't ask for.

**1 — Vertical clip (9:16, straight off TikTok/a phone):**

```bash
ffmpeg -i input.mp4 -t 6 -an \
  -vf "scale=-2:960,fps=24" \
  -c:v libx264 -profile:v high -crf 28 -preset slow \
  -pix_fmt yuv420p -movflags +faststart \
  01.mp4
```

**2 — Square tile (1:1), center-cropped:**

```bash
ffmpeg -i input.mp4 -t 6 -an \
  -vf "crop='min(iw,ih)':'min(iw,ih)',scale=720:720,fps=24" \
  -c:v libx264 -profile:v high -crf 28 -preset slow \
  -pix_fmt yuv420p -movflags +faststart \
  01.mp4
```

**3 — Poster frame (required for every video tile):**

```bash
ffmpeg -ss 0.5 -i 01.mp4 -frames:v 1 -c:v libwebp -quality 80 01-poster.webp
```

**4 — Photos to web-sized WebP:**

```bash
ffmpeg -i photo.jpg -vf "scale='min(1080,iw)':-2" -c:v libwebp -quality 80 photo.webp
```

**5 — Batch a folder (PowerShell):**

```powershell
Get-ChildItem *.mp4 | ForEach-Object {
  ffmpeg -i $_.FullName -t 6 -an -vf "scale=-2:960,fps=24" `
    -c:v libx264 -profile:v high -crf 28 -preset slow `
    -pix_fmt yuv420p -movflags +faststart "out/$($_.BaseName).mp4"
}
```

**What each flag is actually doing** — so you can tune instead of copy-paste:

| Flag | Effect |
|---|---|
| `-an` | Drops the audio track. Biggest free win, and browsers only autoplay muted video anyway. |
| `-t 6` | Trims to 6s. Length is the most direct lever on file size. |
| `scale=-2:960` | Caps height at 960px; `-2` keeps width proportional and even (H.264 requires even dimensions). |
| `fps=24` | Down from 30/60. ~20% off for free on a small looping tile. |
| `-crf 28` | **The quality knob.** Lower = better and bigger. 23 ≈ visually lossless, 28 is fine at tile size, 32 starts to smear. Adjust this first. |
| `-preset slow` | Encoder works harder for the same quality → smaller file. Costs only your time. |
| `-pix_fmt yuv420p` | Required or Safari/iOS shows a black frame. Never omit. |
| `-movflags +faststart` | Moves the index to the front so playback starts before the file finishes downloading. |

If a clip still lands over 1 MB: raise CRF to 30–32, then drop height to 720, then shorten to 4s — in that order.

Check what you got before uploading:

```bash
ls -lh 01.mp4
```

**Don't:** upload the raw TikTok download (typically 1080×1920, 5–10 MB), use GIF (roughly 10× the size of an equivalent MP4), or use a video where a still would say the same thing.

After upload, confirm R2 tagged the type correctly — a wrong `Content-Type` means the tile silently won't play:

```bash
curl -sI https://media.y2kfithn.com/y2k-fit-store-hn/influencers/<slug>/clips/01.mp4 | grep -i content-type
# expect: video/mp4
```

---

## 5. `<CreatorWall />` spec (PDP)

- Server component, no loading state, no CLS — data is local or ISR'd.
- Heading in the existing style: `font-heading uppercase tracking-[0.18em]`, e.g. **"Ya lo llevan puesto"**.
- Mobile: horizontal `scroll-snap-x` row (trust plan §4 already calls for this pattern over pagination). `small:` and up: 3-col grid.
- Tile: square media + overlay strip with platform icon, `@handle`, city, and follower count *only* above threshold.
- Footer link: "Ver todas las colaboraciones →" to `/{countryCode}/colaboraciones`.
- Empty state: if the product has no collab media, fall back to `featured` influencers capped at 3. If there are none at all, render nothing — no skeleton, no "próximamente".
- Disclosure: a small `Colaboración` chip on the tile. Costs nothing, and it's the same honesty rule as the seeded-reviews policy in trust plan §7.

## 6. `/colaboraciones` page spec

- `generateMetadata` mirroring `sobre-nosotros/page.tsx` (canonical, OG, twitter).
- Hero: title + one paragraph on what the collab program is + CTA **"¿Creás contenido? Escribinos"** using `whatsappLink()` from `lib/config/brand.ts`.
- One card per influencer: avatar, name + city, story, social pills with counts, media strip below.
- No per-influencer detail route in v1. Add `/colaboraciones/[slug]` only past ~8 influencers.
- Add a `countsUpdated` date to the data file and re-check quarterly. Stale follower numbers are a small, avoidable credibility leak.

---

## 7. Roadmap

| # | Task | Effort |
|---|---|---|
| 1 | `Influencer` types + `listInfluencers()` / `listInfluencersForProduct()` (Option A source) | XS |
| 2 | Extract social icons to `modules/common/icons/social.tsx`, share with `social-anchor` | XS |
| 3 | Collect + prep media, upload to R2 under `influencers/<slug>/` | S (content, not code) |
| 4 | `<CreatorWall />` + wire into `templates/index.tsx` after the trust strip | S |
| 5 | `/colaboraciones` page + nav/footer/side-menu links | S |
| 6 | L2 looping clips on 1–2 hero tiles | XS |
| 7 | Switch source to R2 JSON (Option B) + validator + TS fallback | S |
| 8 | Admin page writing the JSON (Option C) | M |
| 9 | Medusa module + attribution (Option D) | L |

Items 1–5 are the actual launch. 7 onward are only when the pain shows up.

### Shipped (2026-09-12)

Items 1–5, plus the video tile from 6 (untested against a real clip — no MP4 in the bucket yet). Storefront only; nothing in `my-medusa-store` was touched.

| File | Role |
|---|---|
| `lib/data/influencers.ts` | feed fetch, normalizer, `listInfluencers` / `listInfluencersForProduct` |
| `lib/config/influencers.ts` | bundled fallback (empty by design) |
| `lib/util/format-followers.ts` | shared count formatter |
| `modules/common/icons/social.tsx` | shared TikTok/IG/FB/YT glyphs |
| `modules/influencers/components/media-tile` | square tile: image, in-view looping video, error fallback |
| `modules/influencers/components/creator-avatar` | avatar with branded fallback |
| `modules/influencers/components/social-pills` | social links + gated counts |
| `modules/influencers/templates` | `/colaboraciones` body |
| `modules/products/components/creator-wall` | PDP section |
| `app/[countryCode]/(main)/colaboraciones/page.tsx` | route + metadata |

Verified end to end against the live R2 feed: the collabs page and the PDP wall render real entries; a 404 feed degrades to the empty state with both pages still 200; malformed records are dropped without taking out valid ones; `javascript:` URLs are stripped; duplicate slugs collapse; `order` sorts.

**Still open:** real photos/clips in the bucket, real `productHandles` (currently `nombre-del-producto`, so every PDP shows the featured fallback rather than product-specific tiles), and the `tagline`/`story` copy.

---

## 8. Before you post anyone

- Get written permission to repost (a WhatsApp "sí, dale" screenshot is enough) — reposting a creator's content without asking is the one way this backfires publicly.
- Label collabs as collabs. Honduran buyers are not naive, and an undisclosed paid post that gets called out costs more than the post earned.
- Per trust plan §7: send the product, don't demand the post. The ones who post organically are the ones worth putting on this page.
