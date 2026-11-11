import { AppearanceSchema } from "../../../api/admin/appearance/validators"
import { FONT_SETS, PALETTES } from "../palettes"
import {
  DEFAULT_PREFS,
  hasPrefs,
  parsePrefs,
  resolveTheme,
  samePrefs,
} from "../prefs"

describe("parsePrefs", () => {
  it("reads what was saved, as an object or as the stored string", () => {
    const saved = { palette: "roatan", font: "atletica", aura: false, tabbar: false }
    expect(parsePrefs(saved)).toEqual(saved)
    expect(parsePrefs(JSON.stringify(saved))).toEqual(saved)
    expect(parsePrefs({ palette: "tokio", font: "auto", aura: true, tabbar: true })).toMatchObject({
      palette: "tokio",
      font: "auto",
    })
  })

  it("falls back to the defaults one field at a time", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS)
    expect(parsePrefs("no es json")).toEqual(DEFAULT_PREFS)
    expect(parsePrefs("null")).toEqual(DEFAULT_PREFS)
    expect(parsePrefs(42)).toEqual(DEFAULT_PREFS)
    // A palette removed in a later version: the rest of the choice survives.
    expect(parsePrefs({ palette: "ya-no-existe", font: "terminal", aura: false, tabbar: "sí" })).toEqual({
      palette: DEFAULT_PREFS.palette,
      font: "terminal",
      aura: false,
      tabbar: DEFAULT_PREFS.tabbar,
    })
    expect(parsePrefs({ palette: "copan", font: "comic-sans" }).font).toBe("auto")
  })
})

describe("hasPrefs", () => {
  it("tells a saved look from nothing", () => {
    expect(hasPrefs({ palette: "roatan" })).toBe(true)
    expect(hasPrefs('{"palette":"roatan"}')).toBe(true)
    expect(hasPrefs(null)).toBe(false)
    expect(hasPrefs("")).toBe(false)
    expect(hasPrefs("{}")).toBe(false)
    expect(hasPrefs("no es json")).toBe(false)
    expect(hasPrefs({})).toBe(false)
  })
})

describe("samePrefs", () => {
  it("compares every field", () => {
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS })).toBe(true)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, palette: "tokio" })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, font: "moderna" })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, aura: false })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, tabbar: false })).toBe(false)
  })
})

describe("resolveTheme", () => {
  it("gives each palette its own type set while the choice is automatic", () => {
    for (const palette of PALETTES) {
      const resolved = resolveTheme({ ...DEFAULT_PREFS, palette: palette.id })
      expect(resolved.palette.id).toBe(palette.id)
      expect(resolved.font.id).toBe(palette.font)
    }
  })

  it("lets a chosen type set override the palette's", () => {
    expect(resolveTheme({ ...DEFAULT_PREFS, palette: "catedral", font: "terminal" }).font.id).toBe("terminal")
  })

  it("starts on the store's own look", () => {
    const { palette, font } = resolveTheme(DEFAULT_PREFS)
    expect(palette.id).toBe("catedral")
    expect(font.id).toBe("gotica")
  })
})

describe("what the server accepts", () => {
  it("takes every palette and type set the admin offers", () => {
    for (const palette of PALETTES) {
      for (const font of ["auto", ...FONT_SETS.map((set) => set.id)]) {
        expect(
          AppearanceSchema.safeParse({ palette: palette.id, font, aura: true, tabbar: false }).success
        ).toBe(true)
      }
    }
  })

  it("refuses anything that is not a look", () => {
    const bad = (body: unknown) => AppearanceSchema.safeParse(body).success
    expect(bad({ palette: "roatan", font: "auto", aura: true })).toBe(false)
    expect(bad({ palette: "roatan", font: "auto", aura: "sí", tabbar: true })).toBe(false)
    expect(bad({ palette: "Roatán!", font: "auto", aura: true, tabbar: true })).toBe(false)
    expect(bad({ palette: "x".repeat(41), font: "auto", aura: true, tabbar: true })).toBe(false)
    // Nothing rides along into the user's metadata.
    expect(bad({ palette: "roatan", font: "auto", aura: true, tabbar: true, push_subscriptions: [] })).toBe(false)
  })
})
