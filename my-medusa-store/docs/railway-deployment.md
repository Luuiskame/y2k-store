# Railway Deployment (Medusa backend)

How the Medusa backend (server + worker) deploys to Railway, why we build with
a Dockerfile instead of Railway's default Railpack builder, and how to
troubleshoot deploys.

## Architecture

Two Railway services deploy from this same directory (`my-medusa-store/`):

| Service | Role | Key env vars |
|---|---|---|
| **server** | HTTP API + admin dashboard | `MEDUSA_WORKER_MODE=server`, `MEDUSA_BACKEND_URL` (baked into the admin at build time) |
| **worker** | Background jobs, subscribers, scheduled tasks | `MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true` (skips the admin build → faster image) |

Both build the identical `Dockerfile`. Postgres is on Neon, Redis on Railway;
`REDIS_URL` switches Medusa to the Redis-backed event bus / cache / workflow
engine (see `medusa-config.ts`).

### Railway service settings (must match the image)

| Setting | server | worker |
|---|---|---|
| Custom Start Command | *(empty — image runs `npm run start`)* | *(empty)* |
| Pre-deploy Command | `npx medusa db:migrate` | *(empty — migrations run once, from the server)* |
| Custom Build Command | *(none)* | *(none)* |
| Root Directory | `my-medusa-store` | `my-medusa-store` |

Do **not** reintroduce `cd .medusa/server && npm install ...` commands here.
Inside the image the working directory already *is* the built server with
production dependencies installed; `cd .medusa/server` fails (the folder
doesn't exist in the image) and any boot-time `npm install` re-adds the exact
slowness the Dockerfile removes.

## Why we don't use Railpack (the default builder)

A `medusa build` deployment has an unusual shape: it compiles into
`.medusa/server/`, which carries its **own** `package.json` and needs its own
production install. Railpack doesn't know that, so the July 2026 setup was:

1. **Build:** `npm ci` — full dependency tree (~1,600 packages) from scratch,
   every deploy, no cache.
2. **Boot:** custom start command ran `npm install --omit=dev` **again**, at
   container startup, on a small Hobby-plan runtime box.

Installing Medusa's dependency tree twice per deploy on Railway's slowest
machines made every deploy take tens of minutes (the first ever deploy took
~1.5 h). Then in July 2026 Railway's "Metal" builders started stalling on
`npm ci` — output would stop after the resolution warnings and the build would
sit silent until Railway's fixed **~40-minute build deadline** killed it:

```
Build Failed: build daemon returned an error
< failed to solve: DeadlineExceeded: context deadline exceeded >
```

Diagnosis notes, so nobody re-litigates this:

- The failure reproduced across **different** Metal builders and Railpack
  versions, while the same commit built locally in ~80 s → Railway builder
  infra, not our code.
- The lockfile is clean (every package resolves to `registry.npmjs.org`), so
  it wasn't a rogue git/registry dependency.
- Deploy timing doesn't matter: 40 minutes is a fixed deadline, not
  congestion. A hung `npm ci` at 3 a.m. hangs the same way.
- Upgrading the plan mostly buys a *longer timeout*, which just lets a hung
  step hang longer. The healthy build needs ~3–5 min; the timeout was never
  the problem.
- The old escape hatch (Settings → disable "Metal Build Environment") no
  longer exists — the legacy-builder migration completed in 2026.

## The approach: multi-stage Dockerfile

When a `Dockerfile` exists in the service root, Railway uses it instead of
Railpack. Ours (see `Dockerfile`) does:

1. **Builder stage** — `npm ci` in its own layer (copies only
   `package.json` + `package-lock.json` first), then `COPY . .` and
   `npm run build`, then `npm install --omit=dev` inside `.medusa/server`.
2. **Runner stage** — copies only the built `.medusa/server` into a clean
   `node:20-slim` image. `CMD npm run start`.

Why this fixes each problem:

- **Layer caching:** the `npm ci` layer is reused until `package-lock.json`
  changes. Code-only deploys — the vast majority — skip installation entirely.
  Deploys dropped from 40+ min (or failure) to **~3 min**.
- **Instant boot:** production deps are baked into the image, so container
  startup no longer runs `npm install`. Less downtime, and restarts are cheap.
- **No silent hangs:** `npm ci` runs with
  `--fetch-timeout / --fetch-retries / --fetch-retry-maxtimeout`, so a stalled
  registry connection errors and retries instead of hanging until the
  deadline.
- **Build-time env:** Railway passes service variables into Docker builds as
  build args for any declared `ARG`. The Dockerfile declares
  `MEDUSA_BACKEND_URL` (admin bakes it in) and `DISABLE_MEDUSA_ADMIN`
  (worker skips the admin build).

`.dockerignore` keeps `node_modules`, `.medusa`, `.env*`, etc. out of the
build context so uploads stay small and secrets never enter the image.

## Troubleshooting

- **Log shows the `Railpack` banner instead of Docker steps** → the service's
  Root Directory isn't `my-medusa-store`, so Railway can't see the Dockerfile.
- **Build output goes silent for 10+ minutes** → Railway builder stall.
  Abort and redeploy (cheaper than waiting for the 40-min kill). Check
  <https://status.railway.com> and, if persistent, file at
  <https://station.railway.com> with the build ID.
- **First build after a `package-lock.json` change is slow** → expected; the
  install layer rebuilds once, then caches again.
- **Admin dashboard loads but can't reach the API** → `MEDUSA_BACKEND_URL`
  was wrong/missing *at build time* on the server service. Fix the variable
  and redeploy (a variable change triggers a rebuild).
- **Migrations didn't run** → pre-deploy command on the *server* service must
  be `npx medusa db:migrate`.

## Escalation path

If Railway's builders ever become unusable again (even the cached Docker
build has to get `npm ci` through them once per lockfile change): build the
image in GitHub Actions, push it to GHCR, and point the Railway services at
the published image instead of the repo. That removes Railway's build
infrastructure from the pipeline entirely; Railway only pulls and runs the
image.
