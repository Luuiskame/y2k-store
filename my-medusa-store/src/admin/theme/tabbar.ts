/**
 * The bar at the bottom of the screen on phones and tablets: the four
 * sections the owner lives in, and "Nuevo pedido" in the middle.
 *
 * Medusa has no extension point that is present on every page (widgets only
 * mount inside their own page), so this is plain DOM, mounted once on
 * `document.body`, outside the dashboard's React tree. Three consequences:
 *
 * - Navigation cannot use the dashboard's router, so it goes through the
 *   History API: push the URL, then fire the `popstate` the router listens
 *   for. The state mirrors the router's own shape (`idx`), which keeps its
 *   back/forward bookkeeping right.
 * - The active tab is worked out from the URL, and the dashboard navigates
 *   without telling anyone, so `pushState`/`replaceState` are wrapped to
 *   announce it.
 * - It must stay out of the way of dialogs. Medusa's modals and drawers have
 *   their buttons at the bottom of the screen; the stylesheet hides the bar
 *   whenever a dialog is open (`body:has([role="dialog"])`).
 *
 * Styles live in theme.css (`.y2k-tabbar`). Whether it shows at all is a
 * class on <html> set from the saved preferences, plus a media query.
 */

import type { Dict } from "../i18n/dictionary"
import { subscribeLang } from "../i18n/lang"
import { tr } from "../i18n/tr"

type Tab = {
  path: string
  /** Which word of the dictionary names it. */
  label: Exclude<keyof Dict["appearance"]["nav"], "aria" | "appearance">
  /** Paths that also light this tab up. */
  also?: string[]
  icon: string
  primary?: boolean
}

const svg = (body: string) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

const TABS: Tab[] = [
  {
    path: "/orders",
    label: "orders",
    also: ["/draft-orders"],
    icon: svg(
      `<path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Z"/><path d="M9 8h6M9 12h6"/>`
    ),
  },
  {
    path: "/products",
    label: "products",
    also: ["/collections", "/categories"],
    icon: svg(
      `<path d="M3 11.5V4a1 1 0 0 1 1-1h7.5a1 1 0 0 1 .7.3l8.5 8.5a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 12.2a1 1 0 0 1-.3-.7Z"/><circle cx="7.5" cy="7.5" r="1.2"/>`
    ),
  },
  {
    path: "/nuevo-pedido",
    label: "newOrder",
    primary: true,
    icon: svg(`<path d="M12 5v14M5 12h14"/>`),
  },
  {
    path: "/inventory",
    label: "inventory",
    also: ["/reservations"],
    icon: svg(
      `<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>`
    ),
  },
  {
    path: "/analytics",
    label: "analytics",
    icon: svg(`<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`),
  },
]

/** Pages with no session yet: the bar has nowhere to go from them. */
const PUBLIC_PATHS = ["/login", "/invite", "/reset-password"]

const NAVIGATION_EVENT = "y2k:navigation"

let cachedBase: string | null = null

/**
 * "/app" for an admin served at /app/; "" when it is served at the root.
 * Read off the manifest link that medusa-config.ts adds to the page
 * (`/app/pwa-v1/manifest.webmanifest`), the same way lib/push.ts finds the
 * service worker, so nothing here hardcodes where the admin lives.
 */
const basePath = (): string => {
  if (cachedBase === null) {
    const href = document
      .querySelector<HTMLLinkElement>('link[rel="manifest"]')
      ?.getAttribute("href")
    const match = href ? /^(.*)\/[^/]+\/[^/]+$/.exec(new URL(href, window.location.href).pathname) : null
    cachedBase = match ? match[1] : "/app"
  }
  return cachedBase
}

/** The current path inside the admin, e.g. "/orders/order_123". */
export const adminPath = (): string => {
  const base = basePath()
  const path = window.location.pathname
  const inner = base && path.startsWith(base) ? path.slice(base.length) : path
  return inner || "/"
}

const matches = (path: string, prefix: string) =>
  path === prefix || path.startsWith(prefix + "/")

/** Client-side navigation from outside the dashboard's React tree. */
export const navigateAdmin = (path: string) => {
  const url = basePath() + path
  if (window.location.pathname === url && !window.location.search) {
    return
  }
  const index = Number(window.history.state?.idx)
  window.history.pushState(
    {
      usr: null,
      key: Math.random().toString(36).slice(2, 10),
      idx: Number.isFinite(index) ? index + 1 : 0,
    },
    "",
    url
  )
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }))
}

const announceNavigation = () => {
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method]
    window.history[method] = function (this: History, ...args) {
      const result = original.apply(this, args as Parameters<History["pushState"]>)
      window.dispatchEvent(new Event(NAVIGATION_EVENT))
      return result
    }
  }
}

export const mountTabBar = () => {
  if (document.querySelector(".y2k-tabbar")) {
    return
  }

  const nav = document.createElement("nav")
  nav.className = "y2k-tabbar"

  const buttons = TABS.map((tab) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = tab.primary ? "y2k-tab y2k-tab-primary" : "y2k-tab"
    button.innerHTML = tab.primary
      ? `<span class="y2k-tab-plus">${tab.icon}</span>`
      : `${tab.icon}<span class="y2k-tab-label"></span>`
    button.addEventListener("click", () => navigateAdmin(tab.path))
    nav.appendChild(button)
    return { tab, button }
  })

  // The words, in the language in use; again whenever it changes.
  const relabel = () => {
    const words = tr().appearance.nav
    nav.setAttribute("aria-label", words.aria)
    for (const { tab, button } of buttons) {
      button.setAttribute("aria-label", words[tab.label])
      const text = button.querySelector(".y2k-tab-label")
      if (text) {
        text.textContent = words[tab.label]
      }
    }
  }

  const refresh = () => {
    const path = adminPath()
    nav.hidden = PUBLIC_PATHS.some((prefix) => matches(path, prefix))
    for (const { tab, button } of buttons) {
      const active = [tab.path, ...(tab.also ?? [])].some((prefix) =>
        matches(path, prefix)
      )
      button.classList.toggle("is-active", active)
      if (active) {
        button.setAttribute("aria-current", "page")
      } else {
        button.removeAttribute("aria-current")
      }
    }
  }

  announceNavigation()
  window.addEventListener(NAVIGATION_EVENT, refresh)
  window.addEventListener("popstate", refresh)

  subscribeLang(relabel)

  document.body.appendChild(nav)
  relabel()
  refresh()
}
