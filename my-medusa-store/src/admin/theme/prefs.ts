import { DEFAULT_LANG, Lang, isLang } from "../i18n/lang"
import {
  DEFAULT_PALETTE,
  FONT_SETS,
  FontSet,
  FontSetId,
  PALETTES,
  Palette,
  PaletteId,
  fontSetOf,
  paletteOf,
} from "./palettes"

/**
 * What the owner chose in "Ajustes → Apariencia". Kept per browser in
 * localStorage (read before the first paint, so the panel never flashes the
 * stock look) and copied to the admin user's metadata, so a new phone or
 * computer starts with the same look instead of the default.
 */
export type ThemePrefs = {
  palette: PaletteId
  /** "auto": the type set the palette was designed with. */
  font: FontSetId | "auto"
  /** The glow behind the page. */
  aura: boolean
  /** The bar at the bottom of the screen on phones and tablets. */
  tabbar: boolean
  /** The language of our screens (and, once chosen, of Medusa's). */
  lang: Lang
  /**
   * Whether a language was chosen, here or on Medusa's Profile page. From
   * then on Medusa's own screens are kept in it too, on every device; before
   * that they are left as they were (see i18n/dashboard.ts).
   */
  unified: boolean
  /** The line set big on the sign-in screen, Estadísticas and Modo foto. */
  motto: string
  /** "Modo larp": the phrase ticker, the day's reading and the streak. */
  hype: boolean
}

/** The owner's own phrase; what the panel greets with until they change it. */
export const DEFAULT_MOTTO = "Todo lo bueno está al otro lado del miedo."

/** In characters as a person counts them, not UTF-16 units. */
export const MOTTO_MAX_LENGTH = 80

/**
 * A motto fit to be stored and set in big type: one line, no control
 * characters, trimmed, capped. Nothing left means the default.
 */
export const cleanMotto = (raw: unknown): string => {
  if (typeof raw !== "string") {
    return DEFAULT_MOTTO
  }
  const line = raw
    // Control characters and the two Unicode line breaks.
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
  return Array.from(line).slice(0, MOTTO_MAX_LENGTH).join("").trim() || DEFAULT_MOTTO
}

export const DEFAULT_PREFS: ThemePrefs = {
  palette: DEFAULT_PALETTE,
  font: "auto",
  aura: true,
  tabbar: true,
  lang: DEFAULT_LANG,
  unified: false,
  motto: DEFAULT_MOTTO,
  hype: true,
}

export const THEME_STORAGE_KEY = "y2k-admin-theme"

/** The key under `user.metadata`. */
export const THEME_METADATA_KEY = "y2k_theme"

/**
 * Whatever was stored, as valid preferences: unknown ids (a palette removed
 * in a later version, a hand-edited value) and fields that did not exist yet
 * when it was saved fall back to the defaults one at a time, instead of
 * discarding the rest.
 */
export const parsePrefs = (raw: unknown): ThemePrefs => {
  let value: unknown = raw
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      value = null
    }
  }
  const stored = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >

  const palette = PALETTES.some((p) => p.id === stored.palette)
    ? (stored.palette as PaletteId)
    : DEFAULT_PREFS.palette
  const font =
    stored.font === "auto" || FONT_SETS.some((set) => set.id === stored.font)
      ? (stored.font as ThemePrefs["font"])
      : DEFAULT_PREFS.font

  return {
    palette,
    font,
    aura: typeof stored.aura === "boolean" ? stored.aura : DEFAULT_PREFS.aura,
    tabbar:
      typeof stored.tabbar === "boolean" ? stored.tabbar : DEFAULT_PREFS.tabbar,
    lang: isLang(stored.lang) ? stored.lang : DEFAULT_PREFS.lang,
    unified:
      typeof stored.unified === "boolean" ? stored.unified : DEFAULT_PREFS.unified,
    motto: cleanMotto(stored.motto),
    hype: typeof stored.hype === "boolean" ? stored.hype : DEFAULT_PREFS.hype,
  }
}

/** True when something that looks like saved preferences is there. */
export const hasPrefs = (raw: unknown): boolean => {
  if (typeof raw === "string") {
    try {
      return hasPrefs(JSON.parse(raw))
    } catch {
      return false
    }
  }
  return !!raw && typeof raw === "object" && "palette" in (raw as object)
}

/** Palette, type and the two switches: what "Restablecer" puts back. */
export const sameLook = (a: ThemePrefs, b: ThemePrefs): boolean =>
  a.palette === b.palette &&
  a.font === b.font &&
  a.aura === b.aura &&
  a.tabbar === b.tabbar

export const samePrefs = (a: ThemePrefs, b: ThemePrefs): boolean =>
  sameLook(a, b) &&
  a.lang === b.lang &&
  a.unified === b.unified &&
  a.motto === b.motto &&
  a.hype === b.hype

export type ResolvedTheme = { palette: Palette; font: FontSet }

export const resolveTheme = (prefs: ThemePrefs): ResolvedTheme => {
  const palette = paletteOf(prefs.palette)
  return {
    palette,
    font: fontSetOf(prefs.font === "auto" ? palette.font : prefs.font),
  }
}
