/*
 * Service worker of the Y2K Fit admin (served at /app/sw.js, scope /app/).
 *
 * It only shows the sales alerts the backend pushes (src/lib/admin-push.ts)
 * and opens the right page when one is tapped. There is no fetch handler on
 * purpose: the admin keeps loading from the network exactly as it does in a
 * browser tab, so nothing here can ever serve a stale dashboard.
 */

const SCOPE = self.registration.scope

/** A path from an alert, as a URL that cannot leave the admin. */
const adminUrl = (path) => {
  try {
    const url = new URL(path || "orders", SCOPE)
    if (url.href.startsWith(SCOPE)) {
      return url.href
    }
  } catch (_) {
    // Fall through to the admin's home.
  }
  return SCOPE
}

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let alert = {}
  try {
    alert = event.data ? event.data.json() : {}
  } catch (_) {
    alert = { body: event.data ? event.data.text() : "" }
  }

  const options = {
    body: alert.body || "",
    icon: new URL("pwa-v1/icon-192.png", SCOPE).href,
    data: { url: adminUrl(alert.url) },
  }
  // Same tag replaces the previous alert (several receipts for one order);
  // renotify still rings for it. Chrome rejects renotify without a tag.
  if (alert.tag) {
    options.tag = alert.tag
    options.renotify = true
  }
  if (typeof alert.timestamp === "number") {
    options.timestamp = alert.timestamp
  }

  // Every push has to end in a visible notification: Safari takes the
  // permission away from a web app that receives pushes without showing one.
  event.waitUntil(
    self.registration.showNotification(alert.title || "Y2K Fit", options)
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = adminUrl(event.notification.data && event.notification.data.url)

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      })

      for (const client of windows) {
        if (!client.url.startsWith(SCOPE)) {
          continue
        }
        try {
          const focused = await client.focus()
          await (focused || client).navigate(target)
          return
        } catch (_) {
          // This window cannot be steered from here; open the page instead.
        }
      }

      await self.clients.openWindow(target)
    })()
  )
})
