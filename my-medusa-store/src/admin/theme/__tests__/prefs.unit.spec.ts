import { AppearanceSchema } from "../../../api/admin/appearance/validators"
import { FONT_SETS, PALETTES } from "../palettes"
import {
  DEFAULT_MOTTO,
  DEFAULT_PREFS,
  MOTTO_MAX_LENGTH,
  cleanMotto,
  hasPrefs,
  parsePrefs,
  resolveTheme,
  sameLook,
  samePrefs,
} from "../prefs"

describe("parsePrefs", () => {
  it("reads what was saved, as an object or as the stored string", () => {
    const saved = {
      palette: "roatan",
      font: "atletica",
      aura: false,
      tabbar: false,
      lang: "en",
      unified: true,
      motto: "Primero lo hago, después tengo miedo.",
      hype: false,
    }
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
    expect(
      parsePrefs({ palette: "ya-no-existe", font: "terminal", aura: false, tabbar: "sí", lang: "fr" })
    ).toEqual({
      ...DEFAULT_PREFS,
      font: "terminal",
      aura: false,
    })
    expect(parsePrefs({ palette: "copan", font: "comic-sans" }).font).toBe("auto")
  })

  it("gives a look saved before there was a language the panel it had", () => {
    // What every browser and account holds from the first release.
    const before = { palette: "lempira", font: "auto", aura: true, tabbar: true }
    expect(parsePrefs(before)).toEqual({
      ...before,
      lang: "es",
      // Nobody chose a language yet: Medusa's own is not to be touched.
      unified: false,
      motto: DEFAULT_MOTTO,
      hype: true,
    })
    expect(parsePrefs({ ...before, lang: "es", unified: "sí" }).unified).toBe(false)
  })

  it("knows the two new palettes", () => {
    expect(parsePrefs({ palette: "winter" }).palette).toBe("winter")
    expect(parsePrefs({ palette: "cine" }).palette).toBe("cine")
  })
})

describe("cleanMotto", () => {
  it("starts on the owner's own phrase", () => {
    expect(DEFAULT_MOTTO).toBe("Todo lo bueno está al otro lado del miedo.")
    expect(DEFAULT_PREFS.motto).toBe(DEFAULT_MOTTO)
  })

  it("keeps a motto as it was written", () => {
    expect(cleanMotto("Disciplina > motivación")).toBe("Disciplina > motivación")
    expect(cleanMotto("  Lock in.  ")).toBe("Lock in.")
    expect(cleanMotto("¡A la caja! 💸")).toBe("¡A la caja! 💸")
  })

  it("makes it one line with nothing invisible in it", () => {
    expect(cleanMotto("uno\ndos\ttres")).toBe("uno dos tres")
    expect(cleanMotto("uno\r\n\r\ndos")).toBe("uno dos")
    expect(cleanMotto(`a${String.fromCharCode(0)}b${String.fromCharCode(0x2028)}c`)).toBe("a b c")
    expect(cleanMotto("muchos     espacios")).toBe("muchos espacios")
  })

  it("caps the length by characters, never cutting one in half", () => {
    const long = "ñ".repeat(MOTTO_MAX_LENGTH + 20)
    expect(Array.from(cleanMotto(long))).toHaveLength(MOTTO_MAX_LENGTH)
    // An emoji is two UTF-16 units; a cut in the middle would leave a broken half.
    const emoji = "💸".repeat(MOTTO_MAX_LENGTH + 5)
    const cut = cleanMotto(emoji)
    expect(Array.from(cut)).toHaveLength(MOTTO_MAX_LENGTH)
    expect(cut).toBe("💸".repeat(MOTTO_MAX_LENGTH))
  })

  it("goes back to the original when nothing is left", () => {
    expect(cleanMotto("")).toBe(DEFAULT_MOTTO)
    expect(cleanMotto("   \n ")).toBe(DEFAULT_MOTTO)
    expect(cleanMotto(undefined)).toBe(DEFAULT_MOTTO)
    expect(cleanMotto(42)).toBe(DEFAULT_MOTTO)
    expect(cleanMotto({ toString: () => "no" })).toBe(DEFAULT_MOTTO)
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
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, lang: "en" })).toBe(false)
    // Spanish by default and Spanish by choice are not the same thing.
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, unified: true })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, motto: "Lock in." })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, hype: false })).toBe(false)
  })
})

describe("sameLook", () => {
  it("is what «Restablecer» puts back: not the language, the motto or larp mode", () => {
    const mine = { ...DEFAULT_PREFS, lang: "en" as const, unified: true, motto: "Lock in.", hype: false }
    expect(sameLook(mine, DEFAULT_PREFS)).toBe(true)
    expect(sameLook({ ...mine, palette: "cine" }, DEFAULT_PREFS)).toBe(false)
    expect(sameLook({ ...mine, font: "terminal" }, DEFAULT_PREFS)).toBe(false)
    expect(sameLook({ ...mine, aura: false }, DEFAULT_PREFS)).toBe(false)
    expect(sameLook({ ...mine, tabbar: false }, DEFAULT_PREFS)).toBe(false)
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

  it("takes what the panel saves now, and what an earlier one still sends", () => {
    expect(AppearanceSchema.safeParse(DEFAULT_PREFS).success).toBe(true)
    expect(
      AppearanceSchema.safeParse({ ...DEFAULT_PREFS, lang: "en", unified: true, hype: false }).success
    ).toBe(true)
    // The longest motto the panel can produce fits, in any script.
    expect(
      AppearanceSchema.safeParse({ ...DEFAULT_PREFS, motto: "💸".repeat(MOTTO_MAX_LENGTH) }).success
    ).toBe(true)
    // Without the newer fields: a phone that has not reloaded the panel yet.
    expect(
      AppearanceSchema.safeParse({ palette: "roatan", font: "auto", aura: true, tabbar: true }).success
    ).toBe(true)
  })

  it("refuses anything that is not a look", () => {
    const bad = (body: unknown) => AppearanceSchema.safeParse(body).success
    expect(bad({ palette: "roatan", font: "auto", aura: true })).toBe(false)
    expect(bad({ palette: "roatan", font: "auto", aura: "sí", tabbar: true })).toBe(false)
    expect(bad({ palette: "Roatán!", font: "auto", aura: true, tabbar: true })).toBe(false)
    expect(bad({ palette: "x".repeat(41), font: "auto", aura: true, tabbar: true })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, lang: "fr" })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, hype: "sí" })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, unified: "sí" })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, motto: "x".repeat(201) })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, motto: 42 })).toBe(false)
    // Nothing rides along into the user's metadata.
    expect(bad({ palette: "roatan", font: "auto", aura: true, tabbar: true, push_subscriptions: [] })).toBe(false)
  })
})
