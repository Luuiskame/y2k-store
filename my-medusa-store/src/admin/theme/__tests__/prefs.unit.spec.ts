import { AppearanceSchema } from "../../../api/admin/appearance/validators"
import { FONT_SETS, PALETTES } from "../palettes"
import {
  DEFAULT_MOTTO,
  DEFAULT_PREFS,
  MOTTO_MAX_LENGTH,
  PHRASES_MAX,
  PHRASE_MAX_LENGTH,
  PHRASE_SIZES,
  cleanMotto,
  cleanOpener,
  cleanPhrases,
  hasPrefs,
  isPhraseSize,
  parsePrefs,
  resolveTheme,
  sameLook,
  samePhrases,
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
      mottoOn: false,
      mottoSize: "md",
      opener: "Hoy también se vende.",
      openerOn: false,
      openerSize: "xl",
      phrases: ["Vendo ropa, no excusas", "Hecho en Tegus"],
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
      mottoOn: true,
      mottoSize: "xl",
      opener: "",
      openerOn: true,
      openerSize: "lg",
      phrases: null,
      hype: true,
    })
    expect(parsePrefs({ ...before, lang: "es", unified: "sí" }).unified).toBe(false)
  })

  it("gives a look saved before the phrases had switches what it showed", () => {
    // What the second release stored: the motto closed Estadísticas while
    // larp mode was on, at its biggest, and there was nothing above.
    const before = {
      palette: "cine",
      font: "auto",
      aura: true,
      tabbar: true,
      lang: "es",
      unified: true,
      motto: "Lock in.",
      hype: true,
    }
    expect(parsePrefs(before)).toMatchObject({
      mottoOn: true,
      mottoSize: "xl",
      opener: "",
      phrases: null,
    })
    // With larp mode off the motto was not there, and it still is not.
    expect(parsePrefs({ ...before, hype: false }).mottoOn).toBe(false)
    // Once it has a switch of its own, that is what counts.
    expect(parsePrefs({ ...before, hype: false, mottoOn: true }).mottoOn).toBe(true)
    expect(parsePrefs({ ...before, hype: true, mottoOn: false }).mottoOn).toBe(false)
  })

  it("takes a size it knows and nothing else", () => {
    expect(PHRASE_SIZES).toEqual(["sm", "md", "lg", "xl"])
    for (const size of PHRASE_SIZES) {
      expect(isPhraseSize(size)).toBe(true)
      expect(parsePrefs({ mottoSize: size, openerSize: size })).toMatchObject({
        mottoSize: size,
        openerSize: size,
      })
    }
    expect(isPhraseSize("xxl")).toBe(false)
    expect(isPhraseSize(undefined)).toBe(false)
    expect(parsePrefs({ mottoSize: "xxl", openerSize: 3 })).toMatchObject({
      mottoSize: DEFAULT_PREFS.mottoSize,
      openerSize: DEFAULT_PREFS.openerSize,
    })
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

describe("cleanOpener", () => {
  it("is cleaned like the motto, and may be nothing at all", () => {
    expect(cleanOpener("  Hoy también   se vende.  ")).toBe("Hoy también se vende.")
    expect(cleanOpener(["uno", "dos"].join(String.fromCharCode(10)))).toBe("uno dos")
    expect(Array.from(cleanOpener("ñ".repeat(MOTTO_MAX_LENGTH + 9)))).toHaveLength(MOTTO_MAX_LENGTH)
    // No original to go back to: an empty one is no opening line.
    expect(cleanOpener("")).toBe("")
    expect(cleanOpener("   ")).toBe("")
    expect(cleanOpener(undefined)).toBe("")
    expect(cleanOpener(42)).toBe("")
    expect(DEFAULT_PREFS.opener).toBe("")
  })
})

describe("cleanPhrases", () => {
  it("keeps the owner's lines as written and in their order", () => {
    const mine = ["Vendo ropa, no excusas", "Hecho en Tegus 🇭🇳", "Y2K o nada"]
    expect(cleanPhrases(mine)).toEqual(mine)
  })

  it("cleans each line, drops the blank ones and what is not text", () => {
    const twoLines = ["dos", "tres"].join(String.fromCharCode(10))
    expect(cleanPhrases(["  uno  ", "", "   ", twoLines, 7, null, "cuatro"])).toEqual([
      "uno",
      "dos tres",
      "cuatro",
    ])
    expect(Array.from(cleanPhrases(["x".repeat(PHRASE_MAX_LENGTH + 30)])![0])).toHaveLength(
      PHRASE_MAX_LENGTH
    )
    // An emoji is never cut in half.
    expect(cleanPhrases(["💸".repeat(PHRASE_MAX_LENGTH + 3)])![0]).toBe(
      "💸".repeat(PHRASE_MAX_LENGTH)
    )
  })

  it("holds no more than fit on the ticker", () => {
    const many = Array.from({ length: PHRASES_MAX + 5 }, (_, index) => "frase " + (index + 1))
    expect(cleanPhrases(many)).toEqual(many.slice(0, PHRASES_MAX))
  })

  it("tells no phrases from the originals", () => {
    // An empty list is a choice: a ticker with the motto and the figures only.
    expect(cleanPhrases([])).toEqual([])
    expect(cleanPhrases(["", "  "])).toEqual([])
    // Anything that is not a list means the originals.
    expect(cleanPhrases(null)).toBeNull()
    expect(cleanPhrases(undefined)).toBeNull()
    expect(cleanPhrases("Locked in")).toBeNull()
    expect(cleanPhrases({ 0: "Locked in" })).toBeNull()
    expect(DEFAULT_PREFS.phrases).toBeNull()
    expect(parsePrefs({ phrases: [] }).phrases).toEqual([])
    expect(parsePrefs({ phrases: null }).phrases).toBeNull()
    expect(parsePrefs({}).phrases).toBeNull()
  })
})

describe("samePhrases", () => {
  it("compares line by line, and the originals only with the originals", () => {
    expect(samePhrases(null, null)).toBe(true)
    expect(samePhrases([], [])).toBe(true)
    expect(samePhrases(["a", "b"], ["a", "b"])).toBe(true)
    expect(samePhrases(["a", "b"], ["b", "a"])).toBe(false)
    expect(samePhrases(["a"], ["a", "b"])).toBe(false)
    expect(samePhrases(null, [])).toBe(false)
    expect(samePhrases([], null)).toBe(false)
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
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, mottoOn: false })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, mottoSize: "md" })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, opener: "Hoy se vende." })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, openerOn: false })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, openerSize: "sm" })).toBe(false)
    // The originals and an empty list are not the same ticker.
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, phrases: [] })).toBe(false)
    expect(samePrefs(DEFAULT_PREFS, { ...DEFAULT_PREFS, phrases: ["Y2K o nada"] })).toBe(false)
    expect(
      samePrefs(
        { ...DEFAULT_PREFS, phrases: ["Y2K o nada"] },
        { ...DEFAULT_PREFS, phrases: ["Y2K o nada"] }
      )
    ).toBe(true)
  })
})

describe("sameLook", () => {
  it("is what «Restablecer» puts back: not the language, the phrases or larp mode", () => {
    const mine = {
      ...DEFAULT_PREFS,
      lang: "en" as const,
      unified: true,
      motto: "Lock in.",
      mottoOn: false,
      mottoSize: "sm" as const,
      opener: "Hoy se vende.",
      openerSize: "xl" as const,
      phrases: ["Y2K o nada"],
      hype: false,
    }
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
    // What the second release sends: no phrases of its own, no sizes.
    expect(
      AppearanceSchema.safeParse({
        palette: "cine",
        font: "auto",
        aura: true,
        tabbar: true,
        lang: "es",
        unified: true,
        motto: "Lock in.",
        hype: true,
      }).success
    ).toBe(true)
  })

  it("takes the owner's phrases, at every size, and the way back to the originals", () => {
    for (const size of PHRASE_SIZES) {
      expect(
        AppearanceSchema.safeParse({ ...DEFAULT_PREFS, mottoSize: size, openerSize: size }).success
      ).toBe(true)
    }
    // The most the panel can produce: every line full, in any script.
    const full = Array.from({ length: PHRASES_MAX }, () => "💸".repeat(PHRASE_MAX_LENGTH))
    expect(
      AppearanceSchema.safeParse({
        ...DEFAULT_PREFS,
        opener: "💸".repeat(MOTTO_MAX_LENGTH),
        openerOn: false,
        mottoOn: false,
        phrases: full,
      }).success
    ).toBe(true)
    expect(AppearanceSchema.safeParse({ ...DEFAULT_PREFS, phrases: [] }).success).toBe(true)
    // Null is how "back to the originals" reaches an account that had some.
    expect(AppearanceSchema.safeParse({ ...DEFAULT_PREFS, phrases: null }).success).toBe(true)
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
    expect(bad({ ...DEFAULT_PREFS, opener: "x".repeat(201) })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, openerOn: "sí" })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, mottoOn: 1 })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, mottoSize: "Muy grande" })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, openerSize: 3 })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, phrases: "Locked in" })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, phrases: [42] })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, phrases: ["x".repeat(201)] })).toBe(false)
    expect(bad({ ...DEFAULT_PREFS, phrases: Array.from({ length: 25 }, () => "x") })).toBe(false)
    // Nothing rides along into the user's metadata.
    expect(bad({ palette: "roatan", font: "auto", aura: true, tabbar: true, push_subscriptions: [] })).toBe(false)
  })
})
