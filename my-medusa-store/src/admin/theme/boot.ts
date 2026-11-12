import "./theme.css"

import { keepDashboardInStep, startDashboardLanguage } from "../i18n/dashboard"
import { setLang } from "../i18n/lang"
import { paletteCss } from "./palettes"
import {
  DEFAULT_PREFS,
  THEME_STORAGE_KEY,
  ThemePrefs,
  hasPrefs,
  parsePrefs,
  resolveTheme,
} from "./prefs"
import { mountTabBar } from "./tabbar"

/**
 * Applies the chosen look to the whole admin, on every page.
 *
 * Importing this module is what does it. Medusa bundles every widget and
 * route of `src/admin` into the dashboard's entry, so a module imported by
 * any of them is evaluated once when the admin loads, before React renders
 * the first screen. That makes this the one place that runs everywhere,
 * which the extension API itself does not offer. Every widget and page of
 * this project imports it; one would be enough.
 *
 * What "applying" means:
 * - `data-y2k-palette` and `data-y2k-font` on <html>, which theme.css and
 *   the generated palette stylesheet key off;
 * - the palette's tokens in a <style> (see palettes.ts);
 * - the type set as CSS variables;
 * - the browser's `theme-color`, so the iPhone status bar and the Android
 *   title bar match the page;
 * - the bottom bar for phones;
 * - the language of our screens (i18n/lang.ts), and Medusa's own screens
 *   kept in step with it (i18n/dashboard.ts).
 *
 * Nothing here may throw: a look that fails to load must leave a working
 * admin behind.
 */

type Listener = () => void

const MEDUSA_THEME_KEY = "medusa_admin_theme"
const STYLE_ID = "y2k-palette"
const UNSAVED_KEY = "y2k-admin-theme-unsaved"

const readStored = (): string | null => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

let prefs: ThemePrefs = parsePrefs(readStored())
const listeners = new Set<Listener>()

export const getThemePrefs = (): ThemePrefs => prefs

export const subscribeTheme = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Whether this browser has a look of its own saved. */
export const hasLocalTheme = (): boolean => hasPrefs(readStored())

/**
 * Whether a change made here has not reached the account yet. While it is
 * set, lib/theme-sync.ts sends this browser's copy on the next visit instead
 * of letting the account's older one overwrite it.
 */
export const isThemeUnsaved = (): boolean => {
  try {
    return localStorage.getItem(UNSAVED_KEY) === "1"
  } catch {
    return false
  }
}

export const markThemeUnsaved = (unsaved: boolean) => {
  try {
    if (unsaved) {
      localStorage.setItem(UNSAVED_KEY, "1")
    } else {
      localStorage.removeItem(UNSAVED_KEY)
    }
  } catch {
    // Storage blocked: nothing to remember it in.
  }
}

/** Medusa adds `dark` to <html> itself; this reads which side is showing. */
export const currentMode = (): "dark" | "light" =>
  document.documentElement.classList.contains("dark") ? "dark" : "light"

const syncThemeColor = () => {
  const canvas = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg-subtle")
    .trim()
  if (!canvas) {
    return
  }
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]'
  )
  if (metas.length === 0) {
    const meta = document.createElement("meta")
    meta.name = "theme-color"
    meta.content = canvas
    document.head.appendChild(meta)
    return
  }
  // medusa-config.ts ships one per color scheme; both get the live color.
  metas.forEach((meta) => {
    meta.content = canvas
  })
}

const apply = (next: ThemePrefs) => {
  const html = document.documentElement
  const { palette, font } = resolveTheme(next)

  html.dataset.y2kPalette = palette.id
  html.classList.toggle("y2k-aura", next.aura && !!palette.modes)
  html.classList.toggle("y2k-tabbar-on", next.tabbar)
  setLang(next.lang)
  keepDashboardInStep(next.unified)

  if (font.id === "clasica") {
    delete html.dataset.y2kFont
  } else {
    html.dataset.y2kFont = font.id
  }
  html.style.setProperty("--y2k-font-display", font.display)
  html.style.setProperty("--y2k-font-body", font.body)
  html.style.setProperty("--y2k-display-weight", String(font.weight))
  html.style.setProperty("--y2k-display-tracking", font.tracking)
  html.style.setProperty("--y2k-display-case", font.transform)
  html.style.setProperty("--y2k-display-scale", String(font.scale))

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement("style")
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = paletteCss(palette)

  syncThemeColor()
}

/**
 * Changes the look now. `persist: false` is for a look that came from the
 * account and should not count as this browser's own choice yet.
 */
export const setThemePrefs = (
  patch: Partial<ThemePrefs>,
  { persist = true }: { persist?: boolean } = {}
) => {
  prefs = parsePrefs({ ...prefs, ...patch })
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Storage blocked: the look lasts until the page is closed.
    }
  }
  try {
    apply(prefs)
  } catch (error) {
    console.error("[y2k-theme] could not apply the look", error)
  }
  listeners.forEach((listener) => listener())
}

/**
 * Medusa only adds `dark` to <html> after its first render, so a dark panel
 * starts with a white flash. The same decision it will make is made here,
 * earlier (same storage key, same fallback to the system's preference).
 */
const applyModeEarly = () => {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(MEDUSA_THEME_KEY)
  } catch {
    // Storage blocked: fall through to the system's preference.
  }
  const dark =
    stored === "dark" ||
    ((!stored || stored === "system") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  if (dark) {
    document.documentElement.classList.add("dark")
    document.documentElement.style.colorScheme = "dark"
  }
}

const boot = () => {
  const flag = window as unknown as { __y2kThemeBooted?: boolean }
  if (flag.__y2kThemeBooted) {
    // Hot reload in development: re-apply, mount nothing twice.
    apply(prefs)
    return
  }
  flag.__y2kThemeBooted = true

  applyModeEarly()
  apply(prefs)

  // Medusa's Profile page can change the language too: ours follows (that
  // is a choice of language like the one in Apariencia), and the account
  // hears about it on the next visit.
  startDashboardLanguage((lang) => {
    setThemePrefs({ lang, unified: true })
    markThemeUnsaved(true)
  })

  // The status bar follows Medusa's own light/dark switch.
  new MutationObserver(syncThemeColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })

  const mount = () => {
    try {
      mountTabBar()
    } catch (error) {
      console.error("[y2k-theme] could not mount the bottom bar", error)
    }
  }
  if (document.body) {
    mount()
  } else {
    document.addEventListener("DOMContentLoaded", mount, { once: true })
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  try {
    boot()
  } catch (error) {
    console.error("[y2k-theme] could not start", error)
  }
}

export { DEFAULT_PREFS }
