# Railway Deployment Guide — Medusa Backend (Y2K Fit Honduras)

This document walks through deploying the Medusa v2 backend to **Railway**, with the Neon Postgres DB you already have provisioned. The storefront will be deployed separately to Vercel.

---

## 1. How the backend & admin work in Medusa v2

**They are NOT separate apps.** This is important — you do **not** need two Railway services.

In Medusa v2, the **Admin dashboard is bundled with the backend**:

- `npm run build` (`medusa build`) compiles both the backend API server and the React Admin UI.
- `npm run start` (`medusa start`) launches **one** Node process that serves:
  - REST API (`/store/*`, `/admin/*`, `/auth/*`) on the configured port.
  - Admin dashboard at `/app` (e.g. `https://your-backend.up.railway.app/app`).
  - Background workers (jobs, subscribers, workflows) in the same process by default.

So on Railway you deploy **one service** (this `my-medusa-store/` folder). The admin URL is just `<backend-url>/app`.

> Optionally, Medusa supports a "server mode" + "worker mode" split for scaling, but you don't need it for launch. Stick with the default single-process setup.

### Process model summary
| Concern | Where it lives |
|---|---|
| Storefront API endpoints | This backend → Vercel storefront calls it |
| Admin login + dashboard UI | This backend at `/app` |
| Background jobs / workflows | This backend (in-process) |
| Postgres DB | Neon (already deployed) |
| Redis (events, workflow engine, cache) | **Not configured yet** — see TODO |
| File uploads (product images) | **Local disk by default** — see TODO, you need S3 or similar |

---

## 2. Pre-flight TODO list

### CRITICAL — do these BEFORE deploying

- [done] **ROTATE THE NEON DB PASSWORD.** The current `DATABASE_URL` in `.env` was exposed in chat. Generate a new password in the Neon dashboard, update locally, then use the new one on Railway.
- [done] Verify `.env` is gitignored and **not committed** (it is gitignored — confirmed). Never commit secrets.
- [done] Generate strong random secrets for production (do NOT reuse `supersecret`):
  - `JWT_SECRET` — 32+ random bytes (`openssl rand -base64 48`)
  - `COOKIE_SECRET` — different 32+ random bytes
- [done] Decide your final domains:
  - Backend domain (Railway-provided `*.up.railway.app` is fine, or attach a subdomain like `api.yourdomain.com`)
  - Storefront domain (the one you bought, e.g. `yourdomain.com` and `www.yourdomain.com`)

### Storage / Files (product image uploads) — Cloudflare R2

- [done] **Provider chosen: Cloudflare R2** (S3-compatible, no egress fees).
- [done] **File module configured** in `medusa-config.ts` using `@medusajs/medusa/file-s3` provider (built into `@medusajs/medusa` — no extra install required).

What you still need to do **in the Cloudflare dashboard**:

- [done] In Cloudflare → **R2 → Create bucket**. Name it something like `y2k-fit-honduras-media`. Region: leave default (auto).
- [done] In the bucket's **Settings** tab, enable one of these for public reads (Medusa needs the uploaded images publicly viewable so the storefront can render them):
  - **Option A (quick):** Enable **Public Access → R2.dev subdomain**. Cloudflare gives you a `https://pub-<hash>.r2.dev` URL. Use that for `R2_FILE_URL`.
  - **Option B (recommended for production):** Add a **Custom Domain** (e.g. `cdn.yourdomain.com`) under the bucket's Settings → Custom Domains. Use that for `R2_FILE_URL`.
- [done] In Cloudflare → **R2 → Manage R2 API Tokens → Create API token**:
  - Permissions: **Object Read & Write**
  - Specify bucket: select the bucket you created (least privilege)
  - Save the **Access Key ID** and **Secret Access Key** — you'll see the secret only once.
- [done] Note your Cloudflare **Account ID** (sidebar in the R2 page). Your endpoint is `https://<account_id>.r2.cloudflarestorage.com`.

Env vars to set on Railway (also added to `.env.template`):

| Variable | Example | Notes |
|---|---|---|
| `R2_ENDPOINT` | `https://abc123def456.r2.cloudflarestorage.com` | Account-scoped endpoint (no bucket in path) |
| `R2_BUCKET` | `y2k-fit-honduras-media` | Bucket name |
| `R2_ACCESS_KEY_ID` | from the API token | |
| `R2_SECRET_ACCESS_KEY` | from the API token | Shown only once at creation |
| `R2_FILE_URL` | `https://pub-xxxx.r2.dev` or `https://cdn.yourdomain.com` | Public URL prefix for uploaded files |

- [done] Add the **same 5 vars locally** to `my-medusa-store/.env` if you want to test uploads in dev before deploying. Otherwise dev will fail when you try to upload an image.
- [done] **Update the storefront's `next.config.js`** `images.remotePatterns` to include your R2 hostname, otherwise `next/image` will refuse to render product images. Add:
  ```js
  {
    protocol: "https",
    hostname: "pub-xxxx.r2.dev",  // or "cdn.yourdomain.com"
  }
  ```

After deploy, verify by uploading a product image in the admin → image URL should be `https://<R2_FILE_URL>/<filename>` and load in a browser.

### Events / Cache / Workflow engine — Redis

- [done] **Redis modules wired into `medusa-config.ts`.** Three modules are now registered: `@medusajs/medusa/cache-redis`, `@medusajs/medusa/event-bus-redis`, and `@medusajs/medusa/workflow-engine-redis`. They all read from a single `REDIS_URL` env var.
- [done] **Conditional load.** The Redis modules only register when `REDIS_URL` is set. If it's unset (e.g. local dev without Redis), Medusa falls back to the in-memory implementations and the server still boots normally.
- [done] **`.env.template` updated** with the `REDIS_URL` entry (left blank — intentional, to opt into in-memory locally).

What you still need to do **on Railway**:

- [done] In Railway → your project → **+ New → Database → Add Redis**. This one-click provisions a Redis instance inside the same project and exposes a `REDIS_URL` reference variable.
- [ ] In your Medusa service → **Variables** → click **+ New Variable → Reference → select the Redis service → `REDIS_URL`** (Railway will auto-link it as `${{Redis.REDIS_URL}}`). This way you never paste the URL by hand and rotations propagate automatically.
  - Alternative: Upstash (free tier, separate provider). Copy the `rediss://...` URL from Upstash and paste it as a plain `REDIS_URL` variable on the Medusa service. Note Upstash uses TLS (`rediss://`), which is fine — ioredis handles both.
- [ ] Redeploy. On boot you should see Medusa log three Redis connections (cache, event bus, workflow engine) instead of the in-memory warnings.

Optional (only if you want Redis in local dev):

- [ ] Run `docker run -d --name medusa-redis -p 6379:6379 redis:7-alpine` and set `REDIS_URL=redis://localhost:6379` in `my-medusa-store/.env`. Otherwise leave it blank locally.

### Email / Notifications

- [ ] No notification provider is configured. If you want order confirmation emails, password reset emails, etc., add a provider like Resend, SendGrid, or `@medusajs/notification-sendgrid` and configure it. Otherwise users won't receive auth emails.

### Payments

- [ ] No Stripe (or other payment) module registered in `medusa-config.ts`. Add `@medusajs/payment-stripe` and set `STRIPE_API_KEY` + webhook secret if you want online payments. The storefront `.env.local` already references `NEXT_PUBLIC_STRIPE_KEY` so this is the planned path.

### Code-side prep

- [ ] Ensure `package.json` `engines.node` is `>=20` ✓ (already set).
- [ ] Confirm the `build` and `start` npm scripts work locally before pushing.
- [ ] (Optional) Create a `railway.json` or `nixpacks.toml` if you need to customize the build. Nixpacks should auto-detect Node correctly.

---

## 3. Railway setup steps

### a) Create the service
- [ ] In Railway: **New Project → Deploy from GitHub repo** → select this repo.
- [ ] Set the **Root Directory** to `my-medusa-store` (this is critical — the repo is a monorepo with the storefront alongside).
- [ ] Railway will auto-detect Node via Nixpacks.

### b) Build & start commands
- [ ] **Build command**: `npm install && npm run build`
- [ ] **Start command**: `npm run start`
- [ ] **Pre-deploy command** (runs before each deploy): `npx medusa db:migrate`
  - This applies pending DB migrations to Neon automatically on every deploy. Without it, schema changes won't propagate.

### c) Environment variables (set in Railway → Variables)

Required:

| Variable | Value |
|---|---|
| `DATABASE_URL` | New Neon connection string (after rotation). Keep `?sslmode=require`. |
| `JWT_SECRET` | Strong random string (NOT `supersecret`) |
| `COOKIE_SECRET` | Different strong random string |
| `STORE_CORS` | Your storefront domain(s), comma-separated. e.g. `https://yourdomain.com,https://www.yourdomain.com` |
| `ADMIN_CORS` | Same domain you'll use to access admin. If admin lives at `/app` on backend, set to backend URL: `https://api.yourdomain.com` (or the `*.up.railway.app` URL) |
| `AUTH_CORS` | Both storefront AND admin URLs, comma-separated: `https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com` |
| `NODE_ENV` | `production` |
| `PORT` | Leave unset — Railway injects this automatically and Medusa reads it. |

Recommended once you set them up:

| Variable | Value |
|---|---|
| `REDIS_URL` | **Recommended** — link as `${{Redis.REDIS_URL}}` from the Railway Redis plugin, or paste an Upstash `rediss://...` URL. Unset = in-memory fallback (not recommended for prod). |
| `MEDUSA_BACKEND_URL` | Your public backend URL (used by admin to know its own origin) |
| `STRIPE_API_KEY` | If using Stripe |
| `R2_ENDPOINT` | **Required** for R2 file storage (see section 2) |
| `R2_BUCKET` | **Required** for R2 file storage |
| `R2_ACCESS_KEY_ID` | **Required** for R2 file storage |
| `R2_SECRET_ACCESS_KEY` | **Required** for R2 file storage |
| `R2_FILE_URL` | **Required** for R2 file storage |
| `RESEND_API_KEY` (or SendGrid) | If using email notifications |

### d) First deploy
- [ ] Push to your deploy branch (likely `main`).
- [ ] Watch the build logs in Railway. The first deploy is slow (Medusa admin build takes a few minutes).
- [ ] Once deployed, hit `https://<your-railway-url>/health` — should return 200.

### e) Create the admin user (FIRST TIME ONLY)
After first successful deploy, you need a user to log into the admin. Two options:

**Option 1 — via Railway shell (recommended):**
- [ ] Open Railway service → **Shell** tab
- [ ] Run: `npx medusa user -e you@example.com -p YourStrongPassword`

**Option 2 — temporary one-off command:**
- [ ] Add a temporary railway run: `npx medusa user -e ... -p ...`, then remove it.

- [ ] Log in at `https://<your-backend-url>/app`.

### f) Generate a publishable API key for the storefront
- [ ] In the admin → **Settings → Publishable API Keys** → create one and link to your default sales channel.
- [ ] Copy the key — you'll paste it into Vercel as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` for the storefront.
  - The existing key in `.env.local` (`pk_a4d58db25e1e...`) was generated against your local DB. Since you're now pointing storefront at the Railway backend (which uses Neon), you need a fresh key generated from the deployed admin.

### g) Seed (optional, only if Neon is empty)
- [ ] If your Neon DB is fresh and you want demo data: Railway shell → `npm run seed`
- [ ] Skip this if you've already imported real products.

---

## 4. After backend is live — storefront prep (Vercel)

This is just so you know what's coming next. Don't do these yet unless you're ready.

- [ ] In `my-medusa-store-storefront/.env.local` (or in Vercel env vars), update:
  - `MEDUSA_BACKEND_URL` → `https://api.yourdomain.com` (your Railway backend URL)
  - `NEXT_PUBLIC_BASE_URL` → `https://yourdomain.com` (your bought domain)
  - `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` → the new key from step (f)
  - `REVALIDATE_SECRET` → strong random string (also set the same on backend if you wire revalidation)
  - `NEXT_PUBLIC_DEFAULT_REGION` → `hn` once you create the Honduras region in admin (currently `us` — placeholder)
- [ ] After storefront domain is live on Vercel, **come back to Railway and update `STORE_CORS` and `AUTH_CORS`** to include the real domain(s).
- [ ] Create the Honduras region in admin (Settings → Regions) with currency HNL/USD as appropriate, taxes, and shipping zones.

---

## 5. Post-deploy verification checklist

- [ ] `GET https://<backend>/health` → 200
- [ ] `https://<backend>/app` loads admin login page
- [ ] Can log in with the user created in step (e)
- [ ] `GET https://<backend>/store/regions` returns JSON (use Postman, include header `x-publishable-api-key: <key>`)
- [ ] Storefront on Vercel can fetch products without CORS errors (check browser console)
- [ ] Test a full checkout flow once Stripe + region + shipping are configured
- [ ] Admin can upload a product image and it persists across a redeploy (this only works once S3 is configured)

---

## 6. Open questions / decisions to make

- [ ] **Custom domain for the backend?** Either keep `*.up.railway.app` (free, fine to start) or add `api.yourdomain.com` as a custom domain in Railway → costs nothing extra, looks cleaner.
- [done] **File storage provider:** Cloudflare R2 (configured in `medusa-config.ts`).
- [ ] **Email provider?** Resend is the easiest path for a small store.
- [done] **Redis:** modules configured (cache + event bus + workflow engine). Provision Redis on Railway and link `REDIS_URL`.
