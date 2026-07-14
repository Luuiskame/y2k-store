# Multi-stage build for the Medusa backend (server + worker use this same
# image; MEDUSA_WORKER_MODE / DISABLE_MEDUSA_ADMIN differentiate at runtime).
#
# Why this exists: Railway's Railpack builds ran `npm ci` from scratch on every
# deploy and then `npm install --omit=dev` AGAIN at container boot, which
# regularly blew past Railway's 40-minute build deadline. With Docker layer
# caching, the install layers are reused until package-lock.json changes, and
# the runtime image starts instantly.

FROM node:20-slim AS builder

WORKDIR /app

# Railway exposes service variables to Docker builds as build args when
# declared. The admin dashboard bakes the backend URL in at build time, and the
# worker service sets DISABLE_MEDUSA_ADMIN=true to skip the admin build.
ARG MEDUSA_BACKEND_URL
ARG DISABLE_MEDUSA_ADMIN
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL \
    DISABLE_MEDUSA_ADMIN=$DISABLE_MEDUSA_ADMIN

# Install deps in their own layer so code-only deploys skip this entirely.
# Timeouts/retries keep a stalled registry connection from hanging the build
# until Railway's deadline kills it — fail fast and retry instead.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund \
    --fetch-timeout=120000 --fetch-retries=5 --fetch-retry-maxtimeout=30000

COPY . .
RUN npm run build

# The built server has its own package.json; give it production-only deps.
WORKDIR /app/.medusa/server
RUN npm install --omit=dev --no-audit --no-fund \
    --fetch-timeout=120000 --fetch-retries=5 --fetch-retry-maxtimeout=30000


FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.medusa/server ./

EXPOSE 9000
CMD ["npm", "run", "start"]
