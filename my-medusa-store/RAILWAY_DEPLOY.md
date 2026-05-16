# Railway Deployment Guide — Medusa Backend (Y2K Fit Honduras)

This document walks through deploying the Medusa v2 backend to **Railway**, with Neon Postgres (external) and Railway-managed Redis. The storefront deploys separately to Vercel and is out of scope here.

Stack anchors: Medusa **2.13.1**, Node **20 LTS**, Postgres on **Neon**, Redis on **Railway**, file storage on **Cloudflare R2**.

---

## 1. Architecture — two Railway services, one repo

Medusa v2 production runs as **two Railway services** pointing at the same GitHub repo and the same `my-medusa-store/` root, differentiated by env vars:

| Service | Purpose | `MEDUSA_WORKER_MODE` | `DISABLE_MEDUSA_ADMIN` | Public domain? |
|---|---|---|---|---|
| `server` | HTTP API + admin UI at `/app` | `server` | `false` | yes |
| `worker` | Subscribers, scheduled jobs, workflow engine | `worker` | `true` | no |

Both services share the same `DATABASE_URL` (Neon) and the same `REDIS_URL` (Railway). Do **not** deploy a single shared-mode service in production — shared mode is for local dev only. The two-process split is what makes scheduled jobs, async workflows, and subscribers actually run in production.

> **Local dev** stays single-process: `MEDUSA_WORKER_MODE` unset → defaults to `shared`, one Node process does everything.

---

## 2. Pre-flight TODO list

### CRITICAL — do these BEFORE deploying

- [done] **ROTATE THE NEON DB PASSWORD.** The current `DATABASE_URL` in `.env` was exposed in chat. Generate a new password in the Neon dashboard, update locally, then use the new one on Railway.
- [done] Verify `.env` is gitignored and **not committed** (it is gitignored — confirmed). Never commit secrets.
- [done] Generate strong random secrets for production (do NOT reuse `supersecret`):
  - `JWT_SECRET` — 32+ random bytes (`openssl rand -base64 32`)
  - `COOKIE_SECRET` — different 32+ random bytes
- [done] Decide your final domains:
  - Backend domain (Railway-provided `*.up.railway.app` is fine, or attach `api.yourdomain.com`)
  - Storefront domain (e.g. `y2kfithn.com` and `www.y2kfithn.com`)

### File storage — Cloudflare R2

- [done] **Provider chosen: Cloudflare R2** (S3-compatible, no egress fees).
- [done] **File module configured** in `medusa-config.ts` using `@medusajs/medusa/file-s3`.
- [done] R2 bucket created, public access enabled (custom domain or `r2.dev` subdomain), API token issued.

Env vars (also in `.env.template`):

| Variable | Example | Notes |
|---|---|---|
| `R2_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` | Account-scoped endpoint, **no bucket in path** |
| `R2_BUCKET` | `y2k-fit-store-hn` | Bucket name only |
| `R2_ACCESS_KEY_ID` | from the R2 API token | |
| `R2_SECRET_ACCESS_KEY` | from the R2 API token | Shown only once at creation |
| `R2_FILE_URL` | `https://media.y2kfithn.com` | Public URL prefix, **no bucket in path** (custom domain is bound to the bucket root) |

- [done] **Update the storefront's `next.config.js`** `images.remotePatterns` to include your R2 hostname, otherwise `next/image` will refuse to render product images:
  ```js
  { protocol: "https", hostname: "media.y2kfithn.com" }
  ```

After deploy, verify by uploading a product image in admin → URL should be `https://media.y2kfithn.com/<filename>` and load in a browser.

### Redis — cache, event bus, workflow engine, locking

- [done] **Four Redis-backed infrastructure modules wired into `medusa-config.ts`:** `cache-redis`, `event-bus-redis`, `workflow-engine-redis`, and `locking` (with `locking-redis` provider). All read `REDIS_URL`.
- [done] **Conditional load.** They only register when `REDIS_URL` is set. Unset locally → Medusa falls back to in-memory implementations and boots normally for dev.
- [done] **Railway Redis service provisioned** in the same project.
- [ ] In **each** Medusa service (server AND worker) → Variables → add `REDIS_URL` and reference it as `${{ Redis.REDIS_URL }}?family=0`.
  - The `?family=0` suffix is **required**: Railway's internal DNS returns AAAA (IPv6) records and ioredis's default rejects them. Without it you get `getaddrinfo ENOTFOUND` on boot.

### Email / Notifications

- [ ] No notification provider configured. Add Resend / SendGrid if you want order confirmation, password reset, etc.

### Payments

- [ ] No `@medusajs/payment-stripe` registered. Add it + `STRIPE_API_KEY` + webhook secret when you're ready to take online payments.

### Code-side prep

- [done] `engines.node` is `>=20`.
- [done] `predeploy` script added to `package.json` → `medusa db:migrate`. This is the canonical Medusa migration hook; the **server** service runs it on every boot.
- [ ] Confirm `build` and `start` work locally before pushing.
- [ ] Optional: pin Node 20 explicitly on Railway via a `.nvmrc` file containing `20`, or by setting `NIXPACKS_NODE_VERSION=20` on each service.

---

## 3. Railway setup — server service

### a) Create
- [done] **New Project → Deploy from GitHub repo** → select this repo.
- [done] **Root Directory: `my-medusa-store`** (critical — this is a monorepo).
- [ ] Service name: `server` (or `y2k-store-server`).

### b) Build & start commands
- [ ] **Build command:** `npm ci && npm run build`
- [ ] **Start command:** `cd .medusa/server && npm install --omit=dev && npm run predeploy && npm run start`
  - `medusa build` produces a self-contained app at `.medusa/server/` with its own `package.json`. The production process runs from inside that directory — that's why we `cd` there first.
  - `predeploy` runs DB migrations on every boot (idempotent and safe).
- [ ] **Healthcheck path:** `/health`

### c) Networking
- [ ] Settings → Networking → **Generate Domain**. This gives you `https://<service>.up.railway.app`. Copy that URL — you'll need it for env vars and CORS.

### d) Environment variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | leave unset — Railway injects it and Medusa reads `process.env.PORT` |
| `MEDUSA_WORKER_MODE` | `server` |
| `DISABLE_MEDUSA_ADMIN` | `false` |
| `DATABASE_URL` | Neon **non-pooled** connection string (see warning below), with `?sslmode=require` |
| `REDIS_URL` | `${{ Redis.REDIS_URL }}?family=0` |
| `JWT_SECRET` | `openssl rand -base64 32` (NOT `supersecret`) |
| `COOKIE_SECRET` | different `openssl rand -base64 32` |
| `MEDUSA_BACKEND_URL` | `https://y2k-store-production.up.railway.app` (or your custom domain) |
| `ADMIN_CORS` | same as `MEDUSA_BACKEND_URL` (admin is served from the backend's origin) |
| `AUTH_CORS` | both storefront and admin origins, comma-separated: `https://y2kfithn.com,https://www.y2kfithn.com,https://y2k-store-production.up.railway.app` |
| `STORE_CORS` | storefront origins only: `https://y2kfithn.com,https://www.y2kfithn.com` |
| `R2_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | `y2k-fit-store-hn` |
| `R2_ACCESS_KEY_ID` | from R2 token |
| `R2_SECRET_ACCESS_KEY` | from R2 token |
| `R2_FILE_URL` | `https://media.y2kfithn.com` |
| `NODE_OPTIONS` | `--max-old-space-size=4096` (medusa build is memory-hungry) |

> **⚠️ Neon DATABASE_URL — use the NON-POOLED connection string.** Neon offers two URLs: pooled (host contains `-pooler`) and non-pooled. The pooled one is a PgBouncer transaction-mode pooler, which breaks the prepared statements MikroORM uses → you'll see `Knex: Timeout acquiring a connection. The pool is probably full` during `predeploy`. Medusa manages its own pool, so use the direct (non-pooled) endpoint.

---

## 4. Railway setup — worker service

### a) Create
- [ ] In the **same Railway project**, click **+ New → GitHub Repo** → select the same repo.
- [ ] Root Directory: `my-medusa-store` (same as server).
- [ ] Service name: `worker` (or `y2k-store-worker`).

### b) Build & start commands
- [ ] **Build command:** `npm ci && npm run build`
- [ ] **Start command:** `cd .medusa/server && npm install --omit=dev && npm run start` 
  - **No `predeploy` here.** Only the server runs migrations — otherwise both services race on the migration lock on boot.
- [ ] **Healthcheck:** disable it. The worker has no HTTP listener and the healthcheck will fail.

### c) Networking
- [ ] Do **not** generate a public domain. The worker has nothing to serve over HTTP.

### d) Environment variables

Copy everything from the server service, **with two changes**:

| Variable | Server | Worker |
|---|---|---|
| `MEDUSA_WORKER_MODE` | `server` | **`worker`** |
| `DISABLE_MEDUSA_ADMIN` | `false` | **`true`** |

All other vars (DB, Redis, secrets, CORS, R2, `MEDUSA_BACKEND_URL`) are identical. The worker needs CORS and `MEDUSA_BACKEND_URL` set so its config tree hydrates cleanly without warnings, even though it doesn't serve HTTP.

> Tip: Railway lets you copy variables between services. Set up the server first, then duplicate to the worker and edit just those two values.

---

## 5. First deploy

- [ ] Push to your deploy branch (`feat/deploy` or merge to `main`).
- [ ] Watch the **server** build logs in Railway. First deploy is slow — `medusa build` compiles the admin UI (a few minutes).
- [ ] On server boot you should see four Redis connections (cache / event bus / workflow engine / locking) and migrations running.
- [ ] Worker boot: same Redis connections, no migrations, no HTTP listener — that's expected.
- [ ] Verify `https://<server-domain>/health` → `200`.

---

## 6. First-boot tasks (after server is live)

### a) Create the admin user

Easiest path via Railway CLI from your laptop:

```bash
railway link                           # pick project → server service
railway run npx medusa user --email you@example.com --password '<strong-pw>'
```

Alternative: Railway dashboard → server service → **Shell** tab → run the same `npx medusa user ...` command.

- [ ] Log in at `https://<server-domain>/app`.

### b) Generate a publishable API key for the storefront

- [ ] Admin → **Settings → Publishable API Keys** → create one and link to the default sales channel.
- [ ] Copy the key. The storefront sends it as the `x-publishable-api-key` header on every `/store/*` request (Medusa v2 returns `Publishable API key required` otherwise — that's by design, not a bug).
- [ ] Paste it into Vercel as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
  - The existing key in storefront `.env.local` (`pk_a4d58db25e1e...`) was generated against your local DB. The Neon DB is fresh, so generate a new one from the deployed admin.

### c) Seed (optional, only if Neon is empty)

- [ ] Railway server shell → `npm run seed`. Skip if you've already imported real products.

---

## 7. After backend is live — storefront prep (Vercel)

Out of scope here, but for reference, in `my-medusa-store-storefront/.env.local` (or Vercel env vars):

- `MEDUSA_BACKEND_URL` → `https://y2k-store-production.up.railway.app`
- `NEXT_PUBLIC_BASE_URL` → `https://y2kfithn.com`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` → the new key from step 6b
- `REVALIDATE_SECRET` → strong random string (set same on backend if you wire revalidation)
- `NEXT_PUBLIC_DEFAULT_REGION` → `hn` once the Honduras region exists in admin

After the storefront is live with its real domain, **come back to Railway** and update `STORE_CORS` and `AUTH_CORS` on both services if the final domain differs from what you set initially.

---

## 8. Post-deploy verification checklist

- [ ] `GET https://<server>/health` → 200
- [ ] `https://<server>/app` loads admin login page
- [ ] Can log in with the user from step 6a
- [ ] `GET https://<server>/store/regions` returns JSON (header `x-publishable-api-key: <key>`)
- [ ] Server logs show four Redis connections (cache / event bus / workflow engine / locking) — no in-memory warnings
- [ ] Worker logs show same Redis connections, picks up jobs (test by triggering a workflow from admin)
- [ ] Upload a product image in admin → URL resolves under `https://media.y2kfithn.com/...` and persists across a redeploy
- [ ] Storefront on Vercel can fetch products without CORS errors (browser console)

---

## 9. Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `Knex: Timeout acquiring a connection. The pool is probably full` during `predeploy` | Using Neon's pooled URL with prepared statements | Switch `DATABASE_URL` to Neon's **non-pooled** connection string |
| `error: connection is insecure (try using sslmode=require)` | Missing TLS on Neon URL | Append `?sslmode=require`; the `databaseDriverOptions.connection.ssl` block is also in `medusa-config.ts` |
| `getaddrinfo ENOTFOUND redis.railway.internal` | Node resolved an IPv6 address ioredis rejects | Append `?family=0` to `REDIS_URL` |
| Admin login redirects in a loop / "cookies cannot be set" | Backend served over HTTP, or `MEDUSA_BACKEND_URL` doesn't match the actual domain | Confirm Railway domain is HTTPS and exactly matches `MEDUSA_BACKEND_URL` and `ADMIN_CORS` |
| Worker boots but never picks up jobs | Both services in `shared` mode, or `workflow-engine-redis` not registered | Set `MEDUSA_WORKER_MODE=worker` and verify `REDIS_URL` is set on the worker |
| Migrations run twice and one fails | `predeploy` is on the worker's start command too | Remove `predeploy` from the worker's start command (server only) |
| Uploaded images disappear after redeploy | File module fell back to local disk | Verify all five `R2_*` env vars are set on both services |

---

## 10. Open questions / decisions

- [ ] **Custom domain for the backend?** `*.up.railway.app` is fine to start; `api.y2kfithn.com` as a Railway custom domain costs nothing extra and looks cleaner. If you add one, update `MEDUSA_BACKEND_URL`, `ADMIN_CORS`, and `AUTH_CORS` on both services.
- [done] **File storage provider:** Cloudflare R2.
- [done] **Redis:** all four infrastructure modules configured. Provision in Railway and link `${{ Redis.REDIS_URL }}?family=0`.
- [ ] **Email provider?** Resend is the easiest path for a small store.
- [ ] **Payment provider?** Stripe via `@medusajs/payment-stripe`.
