# Meta Pixel — Event & Setup Checklist (Y2K Fit HN)

Pixel ID `1426590179502716` · domain `y2kfithn.com` (verified).
Base pixel + PageView live via `src/lib/analytics/meta-pixel.tsx`.
Funnel events mapped in `src/lib/analytics/meta-events.ts`.

---

## 1. Standard events — what we send vs. what Meta offers

Meta lists **17** standard events. We implemented **4** — the core commerce funnel.
The rest are classified by whether they make sense for *this* store (DTC compression
shirts, COD / BAC-transfer checkout, WhatsApp-driven support, no wishlist/subscriptions).

### ✅ Done (4/17)

- [x] **ViewContent** — product page (`ViewContentTracker` in product template). `content_ids = [product.id]`, value = cheapest price, currency.
- [x] **AddToCart** — after `addToCart()` succeeds (`product-actions`). `content_ids = [variant.sku]`, value = variant price × qty.
- [x] **InitiateCheckout** — cart "Elegir método de pago" button (`cart/templates/summary`). `num_items`, value = cart total.
- [x] **Purchase** — order-confirmed **and** BAC-transfer pages (`PurchaseTracker`), deduped once-per-order via `localStorage`. value = order total, `eventID = order.id` (for future CAPI dedup).

### 🟡 Worth adding next — relevant to this store

- [ ] **Contact** — `fbq('track','Contact')` on WhatsApp clicks (help link, founder strip, "coordinar contra entrega"). **High value** — WhatsApp is the main support/close channel. Wire it into `whatsapp-help-link` and the other `wa.me` links.
- [ ] **CompleteRegistration** — on successful account creation (`modules/account/components/register`). Medium value; feeds audience building. *(Likely what Meta's auto-detected "Subscribe" is mis-labeling — verify.)*
- [ ] **AddPaymentInfo** — when a payment method is chosen in checkout (`checkout/components/payment`). Low–medium value for COD/BAC (there's no card-info save step), but cheap to add and a valid funnel signal.

### ⚪ Not applicable — skip unless the feature is built

- [ ] ~~AddToWishlist~~ — no wishlist feature.
- [ ] ~~Subscribe~~ — no paid subscription. **Note:** Meta auto-detected a "Subscribe" event; it's a heuristic false-positive — confirm in Test Events and don't hand-code it.
- [ ] ~~StartTrial~~ — no free trials.
- [ ] ~~Lead~~ — no lead/waitlist form (would overlap with Contact anyway).
- [ ] ~~Search~~ — only category filters, no free-text search box. Add only if a search bar ships.
- [ ] ~~CustomizeProduct~~ — no product customizer.
- [ ] ~~FindLocation~~ — online-only, no physical stores.
- [ ] ~~Schedule~~ — no appointments.
- [ ] ~~SubmitApplication~~ — no applications.
- [ ] ~~Donate~~ — not a nonprofit.

**Bottom line:** 4 done, 3 worth adding for this store, ~10 genuinely N/A.
You are *not* missing anything required — the 4 core events cover ad optimization;
Contact is the one with real upside given the WhatsApp-centric model.

---

## 2. How to test everything before/after deploy (no campaigns needed)

You never need to run ads to verify tracking. Three tools, in order of usefulness:

### A. Events Manager → **Probar eventos** (Test Events) — authoritative, real-time
1. Events Manager → select the dataset/pixel → **Probar eventos** tab.
2. Under "Prueba los eventos del navegador", paste your site URL → **Abrir sitio web**.
   It opens your site tagged for testing; events stream into the panel live as you click.
3. Click each event and confirm its parameters (value, currency `HNL`, `content_ids`).

### B. **Meta Pixel Helper** (Chrome extension — you already use it)
Per-page, instant. Icon shows event count; expand to see params and any warnings/errors.

### C. Events Manager → **Descripción general / Historial**
Aggregated counts, **delayed** (minutes to hours). For confirming volume, not debugging.

### Funnel walk-through (do this on the deployed site)
- [ ] Any page → **PageView** fires automatically (and re-fires on route change, once).
- [ ] Open a product → **ViewContent** (`content_ids` = product id, value, currency).
- [ ] Pick a size + Add to cart → **AddToCart** (`content_ids` = variant SKU, value).
- [ ] Cart → "Elegir método de pago" → **InitiateCheckout** (`num_items`, value = total).
- [ ] Place a test order (COD/BAC — no card needed) → confirmed / `transferencia-bac` page → **Purchase** (value = order total, `eventID` = order id).
- [ ] **Refresh** the confirmation page → Purchase must **NOT** fire again (dedup works).

### Gotchas that make it look broken when it isn't
- **Env var on the host:** `NEXT_PUBLIC_META_PIXEL_ID` must be set in the deploy environment (Vercel/host settings), not only in local `.env.local`. If missing, the pixel component renders nothing.
- **Ad blockers / Brave:** block the pixel. Test in a clean Chrome profile with no blockers.
- **Test on the real domain** (`y2kfithn.com`) — it's the verified domain and matches event-priority config.
- **Test order without paying:** COD / BAC transfer places a real order with no charge. Cancel/refund it in Medusa admin afterward.

### After confirming events flow: one free, no-code step in Meta
- [ ] **Rank event priority (Aggregated Event Measurement):** Events Manager → your domain → set the 8 priority events with **Purchase at the top**. Free, no code, and it's what actually drives post-iOS optimization.

---

## 3. Dashboard "Acciones" — status & necessity

All three are Meta upsells toward its **Conversions API Gateway / Datahash / messaging**.
**None are required** for our plan (working pixel now + free self-built CAPI later).
They're flagged "Prioridad alta" from Meta's adoption perspective, not because they block you.

| # | Action | Verdict | Why |
|---|--------|---------|-----|
| 1 | **Activa la conexión automática del píxel… (CAPI Gateway)** | ❌ **Skip** | This routes you into the managed **CAPI Gateway** (Datahash) path. We're building the Conversions API ourselves for free — don't enable the gateway. |
| 2 | **Reclama tu cuenta Datahash…** | ❌ **Skip / let expire** | The **paid** trial claim. Let it lapse **2026-07-30**. Not needed. |
| 3 | **Conéctate a la actividad de chat (mensajes)** | 🕒 **Defer** | Measures conversions from **click-to-WhatsApp/IG/Messenger ads**. Only useful once you run click-to-chat ads + connect WhatsApp Business Platform. Revisit later (fits the WhatsApp strategy). |

- [x] #1 — decided: skip (gateway path)
- [x] #2 — decided: let Datahash trial expire 2026-07-30
- [ ] #3 — deferred until running click-to-chat ads

**Can you "mark any as done"?** Not by completing them — you can safely **dismiss/hide** all
three. Nothing here is a prerequisite; the pixel already works without any of them.

---

## Next build (when ready): server-side Conversions API — task #2

Free, not the paid gateway. Medusa backend route → Meta Graph API, sending the same
events server-side, deduped with the browser pixel via shared `event_id`. Purchase already
carries `eventID = order.id` so the server just reuses `order.id`. Needs a System User +
long-lived token (Business Settings → Users → System Users).
