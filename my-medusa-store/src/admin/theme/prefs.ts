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
}

export const DEFAULT_PREFS: ThemePrefs = {
  palette: DEFAULT_PALETTE,
  font: "auto",
  aura: true,
  tabbar: true,
}

export const THEME_STORAGE_KEY = "y2k-admin-theme"

/** The key under `user.metadata`. */
export const THEME_METADATA_KEY = "y2k_theme"

/**
 * Whatever was stored, as valid preferences: unknown ids (a palette removed
 * in a later version, a hand-edited value) fall back to the defaults one
 * field at a time instead of discarding the rest.
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

export const samePrefs = (a: ThemePrefs, b: ThemePrefs): boolean =>
  a.palette === b.palette &&
  a.font === b.font &&
  a.aura === b.aura &&
  a.tabbar === b.tabbar

export type ResolvedTheme = { palette: Palette; font: FontSet }

export const resolveTheme = (prefs: ThemePrefs): ResolvedTheme => {
  const palette = paletteOf(prefs.palette)
  return {
    palette,
    font: fontSetOf(prefs.font === "auto" ? palette.font : prefs.font),
  }
}
