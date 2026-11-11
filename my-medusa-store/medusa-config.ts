import path from 'path'
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const REDIS_URL = process.env.REDIS_URL

/**
 * Manifest and icons of the admin's Home Screen app, under the admin's path.
 * The admin serves its static files with a one-year `immutable` cache, so to
 * change any of them copy the folder to `pwa-v2/` and point this at it. The
 * service worker (`sw.js`) stays where it is: browsers re-check it on their
 * own, and its URL is what identifies the installed worker.
 */
const PWA_ASSETS = 'pwa-v1'

/**
 * Makes the admin installable as "Y2K Admin". That is how the owner's iPhone
 * gets sales alerts: iOS only delivers Web Push to web apps opened from the
 * Home Screen. The files live in src/admin/public (served at /app/...); this
 * adds the tags that point at them to the admin's page.
 *
 * A Vite plugin, typed by hand: from this CommonJS file TypeScript resolves
 * Vite's CJS typings, which do not export `Plugin`.
 */
type HtmlTag = {
  tag: string
  attrs: Record<string, string>
  injectTo: 'head'
}

const adminPwa = () => {
  let base = '/'
  return {
    name: 'y2k-admin-pwa',
    configResolved(config: { base: string }) {
      base = config.base
    },
    transformIndexHtml: (): HtmlTag[] => [
      { tag: 'link', attrs: { rel: 'manifest', href: `${base}${PWA_ASSETS}/manifest.webmanifest` }, injectTo: 'head' },
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${base}${PWA_ASSETS}/apple-touch-icon.png` }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Y2K Admin' }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#fafafa' }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#18181b' }, injectTo: 'head' },
    ],
  }
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Neon requires TLS. sslmode=require in the URL is honored, but pass
    // driver options too so intermediate/self-signed chains don't trip up.
    databaseDriverOptions: {
      connection: { ssl: { rejectUnauthorized: false } },
    },
    redisUrl: REDIS_URL,
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "server" | "worker") || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      // No fallback on purpose. Left unset, Medusa refuses to boot in
      // production ("http.jwtSecret not found") and only falls back to its
      // public default, with a warning, in development. A `|| "supersecret"`
      // here hid that check: the store would start signing tokens and session
      // cookies with a secret anyone can look up, and say nothing.
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    // The admin lives on the owner's phone as a Home Screen app. Medusa's
    // default session is a fixed 10 hours, so a sales alert tapped the next
    // morning opened the login screen. Rolling 30 days instead: every use
    // pushes the expiry forward, and a month without opening the admin signs
    // that device out.
    sessionOptions: {
      rolling: true,
      ttl: 30 * 24 * 60 * 60 * 1000,
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    vite: () => ({
      publicDir: path.join(process.cwd(), 'src/admin/public'),
      plugins: [adminPwa()],
    }),
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "r2",
            options: {
              file_url: process.env.R2_FILE_URL,
              access_key_id: process.env.R2_ACCESS_KEY_ID,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
              region: "auto",
              bucket: process.env.R2_BUCKET,
              endpoint: process.env.R2_ENDPOINT,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/transferencia-bac",
            id: "transferencia-bac",
          },
          // Cash on delivery, for orders registered from the admin ("Nuevo
          // pedido"). Registered here, but NOT enabled on the region: there
          // it would show up as a payment method in the storefront checkout.
          {
            resolve: "./src/modules/contra-entrega",
            id: "contra-entrega",
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/notification-resend",
            id: "resend",
            options: {
              channels: ["email"],
              apiKey: process.env.RESEND_API_KEY,
              fromEmail: process.env.RESEND_FROM_EMAIL,
              ownerEmail: process.env.STORE_OWNER_EMAIL,
            },
          },
        ],
      },
    },
    ...(REDIS_URL
      ? [
          {
            resolve: "@medusajs/medusa/cache-redis",
            options: {
              redisUrl: REDIS_URL,
            },
          },
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl: REDIS_URL,
              jobOptions: {
                removeOnComplete: { age: 3600, count: 1000 },
                removeOnFail: { age: 3600, count: 1000 },
              },
            },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: {
              redis: {
                url: REDIS_URL,
              },
            },
          },
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/locking-redis",
                  id: "locking-redis",
                  is_default: true,
                  options: {
                    redisUrl: REDIS_URL,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
