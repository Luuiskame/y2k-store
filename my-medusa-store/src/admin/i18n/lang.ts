/**
 * The language of the admin's own screens: Spanish or English.
 *
 * This is only the value and who listens to it, with no React and no DOM, so
 * the formatters in `lib/` can read it and unit tests can flip it. Where it
 * comes from (the saved preferences) is theme/boot.ts; keeping the rest of
 * Medusa's panel in the same language is i18n/dashboard.ts.
 */

export type Lang = "es" | "en"

export const LANGS: Lang[] = ["es", "en"]

/** What every screen was written in before there was a choice. */
export const DEFAULT_LANG: Lang = "es"

/**
 * Sent with the panel's own requests, so the server answers its error
 * messages in the same language. Same name as `ADMIN_LANG_HEADER` in
 * src/lib/admin-lang.ts, which is where it is read.
 */
export const LANG_HEADER = "x-y2k-lang"

export const isLang = (value: unknown): value is Lang =>
  value === "es" || value === "en"

/**
 * One of ours for any language code (`es`, `es-HN`, `en-US`, `fr`…): Spanish
 * in any flavor is Spanish, everything else reads the English screens.
 */
export const langOfCode = (code: string | null | undefined): Lang =>
  (code ?? "").toLowerCase().startsWith("es") ? "es" : "en"

/**
 * The locale dates and words are formatted in. Money and plain numbers keep
 * the Honduran format in both languages ("L 4,500.00"): it is the store's
 * currency, not a matter of language.
 */
export const dateLocale = (lang: Lang): string =>
  lang === "en" ? "en-US" : "es-HN"

type Listener = () => void

let current: Lang = DEFAULT_LANG
const listeners = new Set<Listener>()

export const getLang = (): Lang => current

export const setLang = (next: Lang) => {
  if (next === current) {
    return
  }
  current = next
  listeners.forEach((listener) => listener())
}

export const subscribeLang = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
