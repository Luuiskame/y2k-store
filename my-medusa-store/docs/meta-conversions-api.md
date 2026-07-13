# Meta Conversions API (server-side Purchase)

Server-side counterpart to the browser Meta Pixel. When an order is placed, the
backend sends a **`Purchase`** event straight to Meta from
`src/subscribers/order-placed-meta-capi.ts` (logic in `src/lib/meta-capi.ts`).

Why bother when the pixel already fires Purchase in the browser:

- **Reliability** — survives ad blockers, closed tabs, and iOS tracking limits.
- **Match quality** — carries hashed customer PII (email, phone, name, address).
- It does **not** double-count: it's deduped against the browser event.

## Dedup contract (don't break this)

Meta collapses a browser event and a server event into one conversion when
**`event_name` + `event_id` match**.

- Storefront pixel stamps `eventID = order.id` on its Purchase
  (`src/lib/analytics/meta-events.ts` → `trackPurchase`).
- This backend stamps `event_id = order.id` on the server Purchase.

So both fire on every order — that's expected and correct. `content_ids`,
`value`, and `currency` are built the same way on both sides
(`variant_sku → variant_id → product_id`, `value = order.total`, uppercase
currency) so the two events describe identical items.

The browser fires Purchase on both the `confirmed` and `transferencia-bac`
order pages (deduped once per order via `localStorage`); the server fires once
at `order.placed`. All share `order.id`, so it stays one conversion.

## Setup

### 1. Env vars (see `.env.template`)

| Var | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | yes | Pixel/dataset id — the same id the storefront uses. Already set in this backend's `.env`. (`META_PIXEL_ID` also works and takes precedence.) |
| `META_CAPI_ACCESS_TOKEN` | yes | System User token with access to the pixel. **Without it the subscriber no-ops** (safe for local dev). |
| `META_CAPI_TEST_EVENT_CODE` | no | Routes events to Events Manager → **Test Events** while verifying. Remove for production. |
| `META_EVENT_SOURCE_URL` | no | Storefront URL (e.g. `https://y2kfit.hn`) attached to the event. |
| `META_GRAPH_API_VERSION` | no | Defaults to `v21.0`. |

### 2. Get the access token (free)

1. **Events Manager → your pixel → Settings → Conversions API →
   "Generate access token"** (quickest), **or** create a **System User** in
   Business Settings → Users → System Users, assign it the pixel with full
   control, and generate a token. System User tokens are long-lived and
   preferred for production.
2. Put it in `META_CAPI_ACCESS_TOKEN` on the **backend host** (Railway), not
   just local `.env`.

## Testing

1. Set `META_CAPI_TEST_EVENT_CODE` to the code shown in **Events Manager →
   your pixel → Test Events**.
2. Place a test order on the storefront (product → cart → checkout → confirm).
3. Watch the backend logs for `meta-capi: Purchase sent for order ...`
   (rejections log the Meta error body).
4. In **Test Events** you should see one `Purchase`. When the browser pixel and
   this server event share `order.id`, Meta shows them as **Deduplicated**.
5. Remove `META_CAPI_TEST_EVENT_CODE` once verified so live events count.

## Notes / future work

- Top-of-funnel (ViewContent / AddToCart / InitiateCheckout) stays
  **pixel-only** — the server only sends the high-value `Purchase`.
- Match quality could be improved further by capturing `_fbp` / `_fbc` cookies
  (and client IP / user-agent) at checkout, storing them on the cart/order
  metadata, and adding them to `user_data`. Not required to be effective.
- See the storefront `docs/meta-pixel-checklist.md` for the overall event
  roadmap this fits into.
