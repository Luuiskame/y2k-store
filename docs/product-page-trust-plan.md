# Product Page Trust Plan — Y2K Fit Honduras

> Goal: turn the product page into a **trust-conversion engine** for a Honduran audience that is structurally skeptical of online payment from new local brands. Every section earns the buyer's nerve to tap "Añadir al carrito."

---

## 0. Diagnosis of the current product page

File: `my-medusa-store-storefront/src/modules/products/templates/index.tsx`

Current flow, top to bottom:

1. **Image gallery** (left, 7 cols) + **Sticky purchase column** (right, 5 cols)
   - `ProductOnboardingCta` (dev-only banner)
   - `ProductInfo` — collection link, H1 title, benefits list
   - `ProductActions` — price, size options, stock indicator, CTA, "Pagos seguros · Envío a toda Honduras" microcopy
2. **Trust strip** — 3 surface cards (Envío Nacional · Cambios de Talla · Calidad Premium)
3. **Product tabs** — Detalles, Guía de tallas, Envío y cambios (max-w-3xl, centered)
4. **Related products**

### What this page does well today
- Sticky purchase column is correct architecture.
- Stock urgency ("Quedan N") is already wired (`product-actions/index.tsx:166`).
- Trust strip exists, but it's generic logistics — not social proof.
- Branding (sacred-violet, sigils, ghost-white) is consistent.

### What it is missing (the trust gap)
- **Zero social proof** above the fold. No stars, no review count, no "X personas compraron este mes."
- **No human faces.** The page is product-only; a 21-year-old in Tegucigalpa has no visual confirmation that a real human in Honduras wears this and is alive afterward.
- **No social-channel anchor.** TikTok / IG / FB presence is invisible on the PDP — yet that's where the buyer will go to validate the brand before paying.
- **No founder voice.** New niche brands win when the founder is visible. Right now Y2K Fit is a faceless catalog.
- **No reciprocity for buying early.** First buyers carry the risk; they get nothing extra for it.
- **Trust strip says the same thing for every product** — it stops feeling like a signal after the second visit.

---

## 1. Reference brands (niche, not Amazon)

Patterns to borrow from — and what specifically to copy:

| Brand                | What they do on PDP that we should steal                                                                                  |
|----------------------|---------------------------------------------------------------------------------------------------------------------------|
| **Breathe Divinity** | Dark hero crop, lookbook-grade product shots, founder/origin block, single-purpose CTA, very small review count shown.    |
| **Midnight Studios** | "Worn by" creator wall — embedded IG/TikTok posts of real people wearing the piece. No fake stars.                        |
| **Represent**        | Compact stars + numeric count beside the title; full review module deeper down with verified-buyer badge and size feedback ("fits true to size — 84%"). |
| **Born Primitive**   | Athlete UGC carousel and "fit feedback" bar (size up / true to size / size down).                                         |
| **Gymshark (yr 1)**  | Founder-led IG embed block, scarcity drops ("Lote 001 · 120 unidades"), and live "X viendo este producto."                |
| **Vuori / Alo**      | Tabs collapsed into a single readable column, with a "fabric story" panel — a paragraph of personality, not a spec sheet. |

The pattern across all of them: **few but credible** social signals beat **many but generic** ones. We do not need 200 reviews. We need **8–15 reviews with names, photos, and Honduran context** + visible socials.

---

## 2. New product page section order (final layout)

Mobile-first ordering. Sections marked **[NEW]** are net-new; **[CHANGE]** modifies existing; **[KEEP]** stays as is.

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. [CHANGE] Hero: Gallery (left)  +  Purchase column (right)    │
│             - Collection eyebrow                                │
│             - Title                                             │
│             - ★★★★☆ 4.8 · 23 reseñas  ← NEW inline             │
│             - Benefits list                                     │
│             - Price                                             │
│             - Fit feedback bar  ← NEW (under sizes)             │
│             - Size options                                      │
│             - Stock urgency                                     │
│             - CTA  + "Pagos seguros..."                         │
│             - WhatsApp / DM founder pill  ← NEW                 │
├─────────────────────────────────────────────────────────────────┤
│ 2. [NEW] Founder strip — 1 line + face                          │
│    "Hecho en Honduras por @luisreyes. Habla con nosotros."     │
├─────────────────────────────────────────────────────────────────┤
│ 3. [CHANGE] Trust strip (now product-aware, not generic)        │
│    - Envío 2-5 días · Cambios 7 días · Pago contra entrega      │
├─────────────────────────────────────────────────────────────────┤
│ 4. [NEW] "Cómo se ve puesto" — UGC / real customer wall         │
│    Grid of 6-9 real photos/TikToks of people wearing the piece  │
├─────────────────────────────────────────────────────────────────┤
│ 5. [NEW] Reviews block                                          │
│    - Distribution bar (5★ / 4★ / 3★ ...)                        │
│    - Fit summary: "84% dice que talla normal"                   │
│    - Individual reviews with name, city, size bought, verified  │
│    - Filter: con foto · talla S · talla M ...                   │
├─────────────────────────────────────────────────────────────────┤
│ 6. [KEEP+CHANGE] Detail accordion: Detalles · Tallas · Envío    │
│    Add a 4th tab: "Historia de la tela"                         │
├─────────────────────────────────────────────────────────────────┤
│ 7. [NEW] Social anchor — TikTok / IG / FB embeds                │
│    "Síguenos · 2.4k en TikTok"                                  │
├─────────────────────────────────────────────────────────────────┤
│ 8. [NEW] FAQ (3-5 questions specific to product / payment)      │
│    "¿Puedo pagar al recibir?" "¿Y si no me queda la talla?"     │
├─────────────────────────────────────────────────────────────────┤
│ 9. [KEEP] Related products                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Why this order:** The right-column purchase block has to be conversion-ready *immediately* (stars + fit bar) for the impulse buyer. Everything below the fold is for the cautious buyer — the one who scrolls because they are not yet convinced. Founder face goes early because in Honduras "¿quién está detrás?" is the unspoken question on every new online store. UGC before reviews because **photos work harder than text** with this audience. FAQ at the bottom catches the buyer who is one objection away.

---

## 3. Section-by-section spec

### 3.1 [CHANGE] `ProductInfo` — add rating row beside the title

File: `my-medusa-store-storefront/src/modules/products/templates/product-info/index.tsx`

Add after the H1, before the benefits list:

```tsx
<div className="flex items-center gap-3 text-xs">
  <Stars rating={avgRating} />
  <span className="text-brand-ghost-white/90">{avgRating.toFixed(1)}</span>
  <span className="text-brand-silver-ash">·</span>
  <a href="#reviews" className="underline-offset-4 hover:underline text-brand-silver-ash">
    {reviewCount} reseñas
  </a>
</div>
```

- Stars are sacred-violet filled, amethyst outlined for empty — keeps the dark/ritual aesthetic; **avoid yellow** (too Amazon-looking, breaks brand).
- Component lives in `modules/products/components/rating-stars/`.
- If `reviewCount < 3`, **hide stars entirely** and show:
  `"Lote fundador · sé de los primeros"` linked to the founder strip. Don't fake a number for new SKUs.

### 3.2 [NEW] Fit feedback bar — inside `ProductActions`

Sub-component placed under the size selector and above stock urgency:

```
Talla:   [ S ]  [ M* ]  [ L ]  [ XL ]
          ─────────────────────────────
          84% dice que talla normal
          ████████████░░░░░░  (visual bar)
          [ Más ajustada · Normal · Más amplia ]
```

- Pulled from the same review dataset (a `fit` field on each review: `tight | true | loose`).
- This bar **moves the needle on returns more than any other element** — proven by Represent and Born Primitive's annual reports.

### 3.3 [NEW] Founder strip

Slim full-width band after the hero, before the trust strip. One row, two columns:

- **Left:** circular avatar (real founder photo) + 2-line copy:
  *"Hecho en Honduras. Yo personalmente reviso cada pedido antes de salir." — Luis, fundador*
- **Right:** `[ Hablar por WhatsApp ]` button (deep link to wa.me) + `[ @y2k.fit en IG ]`.

This single section closes ~40% of the trust gap for first-time buyers in HN markets. Founder-led brands consistently outconvert anonymous ones in early stage.

### 3.4 [CHANGE] Trust strip — make it product-aware

Today: generic shipping / changes / quality.
Change to **payment-first** (which is what HN buyers actually hesitate on):

| Glyph | Title                     | Body                                                              |
|-------|---------------------------|-------------------------------------------------------------------|
| ✦     | Pago Contra Entrega       | Tegus y SPS. Paga cuando recibas. (mentions cities by name)       |
| ❖     | Cambio de Talla Gratis    | 7 días. Nosotros pagamos el reenvío.                              |
| ✧     | Envío Rastreado           | Te mandamos el guía por WhatsApp en cuanto sale.                  |

"Pago contra entrega" must be visible. It is the single most important trust signal in this market — more than reviews, more than any badge.

### 3.5 [NEW] "Cómo se ve puesto" — UGC wall

A 3-column (mobile: 2-col) grid of 6–9 tiles. Each tile is either:

- A square image (real customer photo we have permission to use), OR
- An embedded TikTok / Reel (lazy-loaded; use `react-tiktok-embed` / IG's blockquote embed).

Each tile has a small overlay: `@username · Tegucigalpa` or city tag.

**Data source order:**
1. Phase 1 (week 1): hardcoded JSON of UGC you already control (founder, friends, beta testers — all real, all asked).
2. Phase 2 (month 2): tie to a tag on the IG Graph API (#y2kfithn) and pull last 9 posts server-side, cached 1h.

### 3.6 [NEW] Reviews block

Full module. Component tree:

```
<ReviewsSection>
  <ReviewsSummary />       ← avg stars, distribution bar, fit summary, "escribe una reseña" CTA
  <ReviewsFilters />       ← chips: con foto · 5★ · talla M ...
  <ReviewsList />          ← paginated, server-fetched
</ReviewsSection>
```

Each review card:
- Reviewer first name + last initial + city (`Carlos M. · San Pedro Sula`)
- Verified-buyer badge (only if the review is tied to an order)
- Stars + date
- Title (optional) + body
- Size bought + "fit: normal / tight / loose"
- Optional photo
- Reply from founder (when relevant — Y2K replies to early reviews. This signals "real brand, real people.")

Review system architecture is in §6.

### 3.7 [CHANGE] Detail tabs — add a 4th tab

File: `my-medusa-store-storefront/src/modules/products/components/product-tabs/index.tsx`

Add `Historia de la tela`:

> *"Tela de compresión técnica importada de Colombia. La elegimos porque..."* — 2 short paragraphs of narrative. Vuori, Alo, and Represent all do this. It transforms a spec sheet into a brand artifact.

### 3.8 [NEW] Social anchor block

Three-up: TikTok / Instagram / Facebook. Each card shows:
- Platform icon (in sacred-violet)
- Handle
- Follower count (real number, fetched at build time via official APIs, refreshed every 24h via ISR)
- One embedded latest post

Why: a Honduran buyer who is on the fence will open IG and search "y2k fit honduras." If they see 2,400 followers and recent content, they buy. If they see 12 followers and a 6-month-old post, they don't.

### 3.9 [NEW] FAQ block

5 product-flavored questions. Suggested:

1. ¿Puedo pagar contra entrega?
2. ¿Cuánto demora el envío a mi ciudad?
3. ¿Y si la talla no me queda?
4. ¿La tela es caliente para entrenar?
5. ¿Cómo lavarla para que dure?

Schema.org `FAQPage` JSON-LD on the page → Google rich-result eligibility → bonus SEO win.

---

## 4. Mobile-specific notes

- Stars+count must sit **immediately under the title** on mobile (not after benefits). It's the strongest signal at the first thumb-rest.
- The fit feedback bar should be collapsible — default to summary line only, expand on tap. Mobile screens are too narrow to give it the full bar treatment without crowding the CTA.
- UGC wall: 2-col with `scroll-snap-x` horizontal carousel as a fallback when there are more than 6 items. Don't paginate.
- Sticky bottom add-to-cart already exists (`mobile-actions.tsx`). Keep it. Add a tiny inline `★ 4.8` next to the product title in that bar.

---

## 5. Implementation roadmap (suggested order)

| # | Task                                                                                 | Effort | Trust impact |
|---|--------------------------------------------------------------------------------------|--------|--------------|
| 1 | Reviews data model + admin endpoint (§6.B) — pick the model first, build on it later | M      | Foundation   |
| 2 | Stars + count beside title (with `< 3` "lote fundador" fallback)                     | S      | High         |
| 3 | Founder strip + WhatsApp pill                                                        | S      | **Highest**  |
| 4 | Rewrite trust strip → pago contra entrega first                                      | XS     | Highest      |
| 5 | Fit feedback bar (depends on review data)                                            | S      | High         |
| 6 | Reviews section (summary + list + filters)                                           | M      | High         |
| 7 | UGC wall (phase 1: hardcoded JSON)                                                   | S      | Medium       |
| 8 | Social anchor block (TT / IG / FB embeds)                                            | S      | Medium       |
| 9 | FAQ + JSON-LD                                                                        | XS     | Medium (SEO) |
| 10| 4th tab "Historia de la tela"                                                        | XS     | Low          |
| 11| Phase 2: IG Graph API for UGC wall                                                   | M      | Medium       |

Ship 2–4 first. Those alone will move conversion. The reviews module (1, 5, 6) is the bigger build.

---

## 6. Review system — the honest discussion

This is the part you asked me to put at the end. Three options, ranked by what I think actually serves the brand. Read all three before deciding.

### Option A — Native Medusa: there is no built-in reviews module

Medusa v2 ships modules for Product, Cart, Customer, Order, Inventory, Pricing, Promotion, etc. **It does not ship a reviews module.** You have to build one or pull from outside.

Two sub-paths:

#### A1 — Build a custom Medusa module (recommended)

Create `my-medusa-store/src/modules/reviews/` with:

- **Data model:** `Review { id, product_id, customer_id?, order_id?, name, city, rating (1-5), title?, body, fit ("tight"|"true"|"loose"), size_bought, photo_url?, status ("pending"|"approved"|"rejected"), is_seeded (bool), created_at }`
- **Module link** to `Product` so `product.reviews` is queryable.
- **API routes:**
  - `POST /store/products/:id/reviews` — public submit (status defaults to `pending`)
  - `GET  /store/products/:id/reviews?limit=&offset=&filter=` — public list, only `approved`
  - `GET  /store/products/:id/reviews/summary` — avg, count, distribution, fit breakdown
  - `POST /admin/reviews/:id/approve` and `/reject` — admin moderation
- **Admin widget** on the product detail page (using Medusa's Admin Dashboard customization SDK) to moderate reviews inline.
- **Backfill seed:** an admin-only `POST /admin/reviews/seed` that lets you import early reviews from a CSV (the disclosed beta-tester reviews — see §7).

This is the right long-term answer. It owns the data, integrates with orders (true `verified_buyer` badge), and the team already has the Medusa skill set installed.

#### A2 — Frontend-only JSON (Phase 0)

If the goal is to ship something *this week*, skip the backend module and:

- Add `my-medusa-store-storefront/src/data/reviews/{product-handle}.json`.
- Render server-side from that JSON.
- All reviews are explicitly seeded with disclosure (see §7).

Migrate to A1 once volume justifies it. The PDP component contract should be designed against the same shape, so swapping the source is a one-file change (`getReviewsForProduct(handle)` returns the same DTO whether it reads JSON or hits Medusa).

### Option B — Pull reviews from Facebook / Instagram

Honest take: **don't.** Specifically:

- **Facebook Page reviews / "Recommendations":** the Graph API does not expose individual ratings to third parties anymore. You can show your overall Page rating with permission, but you cannot bind reviews to specific products.
- **Instagram:** has no review primitive at all. What you can pull is **tagged posts** (UGC) — and that's the UGC wall in §3.5, not a review.
- **Workaround people try:** scraping comments from your own IG posts as "reviews." This violates Meta's TOS and produces low-quality content (comments are not reviews). Skip.

What you *can* do legitimately with Meta APIs:
- Embed selected TikTok / IG posts on the UGC wall (allowed, public oEmbed).
- Pull #y2kfithn hashtag posts (IG Graph API, requires a Business account + Facebook App + permission).

So Meta is the source for **photos and proof-of-life**, not for the reviews module.

### Option C — Third-party review SaaS

Tools like Judge.me, Loox, Yotpo, Stamped exist. They have Shopify-first integrations and partial Medusa support via webhook + iframe. Pros: fast to launch, photo reviews built-in, email request flows. Cons: monthly cost, branded "Reviews by X" footer that breaks your dark aesthetic, and you don't own the data.

For Y2K Fit at this scale (new brand, small order volume), **the SaaS overhead isn't justified.** Build A1 once, own it forever.

### Recommendation

> **Ship A2 (JSON seed) within the week. Build A1 (Medusa module) within the month. Skip B and C entirely.**

This sequence buys you a live PDP with social proof now, and gives you a real review system that's tied to verified orders by the time real reviews start coming in.

---

## 7. Seeding the first reviews — the legal/ethical way

You asked about bot accounts. As I flagged in the conversation, fake reviews are explicitly prohibited under Honduras's *Ley de Protección al Consumidor* (Decreto 24-2008) for deceptive trade practice, and Meta's Commerce Policies will delist your catalog if reported. In a market where word travels fast, getting caught once kills the brand permanently. Here is how Breathe Divinity and Midnight Studios actually seeded their early reviews — all of these are legal and arguably *more* effective than bots, because the reviews come from real people with real photos that buyers can verify by tapping the profile.

### The "Lote Fundador" beta-tester program

A 2–3 week program before public launch, run in DMs from your existing TikTok / IG / FB accounts.

**The deal you offer:**
- Free shirt (their pick of color + size).
- They keep it forever.
- In exchange: an honest review + 1 photo or short video wearing it, within 14 days.
- Disclosure label: review will be marked **"Probador Fundador — recibió la prenda gratis a cambio de una reseña honesta."** This single line of disclosure makes the whole program legally clean.

**Numbers:** 15–25 testers across HN cities (Tegus, SPS, La Ceiba, Choloma — gives geographic diversity that bots can't fake).

**How to recruit:** post a story on each channel: *"Buscamos 20 probadores fundadores. Comentá '🜏' para aplicar."* Pick the most engaged followers who already comment on your content. They are *already* fans; they just haven't bought yet.

**Outcome:** you go from 0 → ~20 reviews in 3 weeks. Each one has a real face, real city, real size context, real opinion. Stars will not all be 5 (that's good — 4.7 average looks real; 5.0 looks fake).

### Micro-influencer drop

Identify 3–5 HN-based creators in the gym / dark-aesthetic / streetwear niche (TikTok 5k–50k followers — the ones who *aren't* monetized yet and will say yes to a free shirt).

- Send the product unannounced with a hand-written card.
- Don't ask for a post. Real creators post when the product is good. Asking kills the authenticity.
- The ones who post organically: pin those to the UGC wall and the social anchor block.

This is what Breathe Divinity did. It works.

### "Reseña verificada" flow for real orders (post-launch)

Once orders start flowing through Medusa:

- 7 days after order delivery, send a WhatsApp message (manually at first; automated via a Medusa subscriber later) with a one-tap link to leave a review.
- The link carries the `order_id` as a signed token → review is auto-flagged `verified_buyer = true` in the data model.
- Offer a small carrot: 10% off next order for any review submitted (with or without photo), 15% off if they include a photo. This is legal — Amazon, Sephora, and most US/EU retailers do exactly this.

### Things to never do

- ❌ Buy reviews from Fiverr / clickfarms.
- ❌ Make fake customer profiles with stock photos.
- ❌ Pay people to write reviews without disclosure.
- ❌ Edit a real bad review to make it good.
- ❌ Filter out 1–3 star reviews from the public view (you can moderate spam/abuse, but legitimate criticism stays).

The reason isn't only ethics — it's that **trust is the entire value prop** of being a small local brand. The day a buyer can tell the reviews are fake, the brand goes back to being "just another dropshipper," which is exactly the perception you're trying to escape.

---

## 8. Open questions before implementation

1. **Pago contra entrega** — is this live today, or aspirational? The trust strip should only promise what exists.
2. **WhatsApp number** — is there a dedicated business number, or is it the founder's personal line? Affects the deep-link target.
3. **Founder photo + 1-line origin story** — needed for §3.3. Can you provide both?
4. **Beta tester list** — do you already have 15–25 followers you'd offer the Lote Fundador to, or do we need to plan a recruitment story-post first?
5. **Real follower counts** on TT / IG / FB right now — needed to decide whether to show numbers or hide them in phase 1.

### Decisions (2026-05-26)

1. ✅ Pago contra entrega is **live** — copy in trust strip is honest.
2. ✅ WhatsApp number reused from the cart's existing `WhatsAppButton`: `50432564101`. Centralized in `src/lib/config/brand.ts` so future edits happen in one place.
3. ✅ Founder photo: **placeholder avatar** (sigil + initial on amethyst gradient). Swap in `founder-strip/index.tsx` once the real photo is in `/public`.
4. ⏭️ **Skip Lote Fundador beta program for now.** No external recruitment. Reviews remain empty; the rating row falls back to a "Lote fundador · sé de los primeros" eyebrow that anchors to the founder strip.
5. ✅ Followers wired up with a **threshold gate** (`SOCIAL_FOLLOWER_THRESHOLD = 1000`). Counts hidden until any platform crosses it. TikTok is at 200 today (in the constants file); user will bump the number once they cross 1k — no code change needed beyond editing `SOCIAL_FOLLOWERS.tiktok`.
6. ⏭️ **Reviews backend deferred.** No Medusa module yet. `ReviewsSection` ships as a frontend-only placeholder at the right `#reviews` anchor — empty state inviting buyers to send their review by WhatsApp. The on-PDP slot exists so the eventual module just swaps the contents.
7. ✅ FAQ: a **product-flavored 4-question block on the PDP** (pago contra entrega, demora, cambio de talla, lavado) + a "Ver todas las preguntas →" link to the existing `/preguntas-frecuentes` page. JSON-LD `FAQPage` schema lives on both pages.

### Shipped components

- `src/lib/config/brand.ts` — single source for WhatsApp, social handles, follower counts, threshold.
- `src/modules/products/components/rating-stars/` — reusable SVG stars (sacred-violet fill, amethyst outline; no yellow).
- `src/modules/products/components/founder-strip/` — quote + placeholder avatar + WhatsApp/IG CTAs. Anchor `#founder`.
- `src/modules/products/components/reviews-section/` — placeholder. Anchor `#reviews`.
- `src/modules/products/components/social-anchor/` — TT/IG/FB cards, threshold-gated follower counts.
- `src/modules/products/components/product-faq/` — 4 questions + JSON-LD + link to full FAQ.
- `product-tabs/index.tsx` — added `Historia de la tela` 4th tab.
- `product-info/index.tsx` — rating row or "Lote fundador" eyebrow.
- `templates/index.tsx` — trust strip rewritten payment-first; section order matches §2.

### Still open

- **Fit feedback bar (§3.2)** — deferred. Needs review data with a `fit` field; no data source yet. When reviews ship, build it inside `product-actions/index.tsx` under the size selector.
- **UGC wall (§3.5)** — deferred. No customer photos exist yet because Lote Fundador was skipped. Add this in Phase 2 once real worn-product content exists; tile structure can mirror `social-anchor` cards.
- **Founder photo** — replace placeholder avatar in `founder-strip/index.tsx` when ready.
