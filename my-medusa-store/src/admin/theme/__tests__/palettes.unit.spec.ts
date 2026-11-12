import { contrast, mix, oklch, parseHex, toHex, toOklch } from "../color"
import { MEDUSA_EFFECTS } from "../medusa-tokens"
import {
  DEFAULT_PALETTE,
  FONT_SETS,
  LARGE_TEXT_CONTRAST,
  Mode,
  PALETTES,
  fontSetOf,
  inkOf,
  paletteCss,
  paletteOf,
  paletteTokens,
  previewOf,
  swatchesOf,
} from "../palettes"

const MODES: Mode[] = ["dark", "light"]
const WHITE = { r: 1, g: 1, b: 1 }

const themed = PALETTES.filter((palette) => palette.modes)

describe("color math", () => {
  it("turns OKLCH into the sRGB it stands for", () => {
    expect(toHex(oklch(1, 0, 0))).toBe("#ffffff")
    expect(toHex(oklch(0, 0, 0))).toBe("#000000")
    // Tailwind's violet-500, whose OKLCH coordinates are published.
    expect(toHex(oklch(0.6268, 0.2325, 303.9))).toBe("#a855f7")
  })

  it("round-trips a brand color through OKLCH", () => {
    for (const hex of ["#a855f7", "#0f766e", "#d92d20", "#e9c46a", "#1a0a2e"]) {
      const { l, c, h } = toOklch(parseHex(hex))
      expect(toHex(oklch(l, c, h))).toBe(hex)
    }
  })

  it("gives up chroma, not lightness, for a color no screen can show", () => {
    const vivid = oklch(0.6, 0.5, 150)
    const { l } = toOklch(vivid)
    expect(l).toBeCloseTo(0.6, 1)
    expect(Math.max(vivid.r, vivid.g, vivid.b)).toBeLessThanOrEqual(1)
  })

  it("measures contrast the WCAG way", () => {
    expect(contrast(WHITE, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 5)
    // The storefront's documented pair: Ghost White on Violet Deep, 5.13:1.
    expect(contrast(parseHex("#F5F0FF"), parseHex("#8E42BD"))).toBeCloseTo(5.13, 1)
  })
})

describe("palettes", () => {
  it("have unique ids and names, and the default exists", () => {
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length)
    expect(new Set(PALETTES.map((p) => p.name)).size).toBe(PALETTES.length)
    expect(paletteOf(DEFAULT_PALETTE).id).toBe(DEFAULT_PALETTE)
    expect(paletteOf("no-existe").id).toBe(DEFAULT_PALETTE)
    expect(paletteOf(null).id).toBe(DEFAULT_PALETTE)
  })

  it("each name a type set that exists", () => {
    for (const palette of PALETTES) {
      expect(FONT_SETS.some((set) => set.id === palette.font)).toBe(true)
    }
    expect(fontSetOf("no-existe").id).toBe(FONT_SETS[0].id)
  })

  it("move the second accent only where it could not be read as text", () => {
    const moved = themed.flatMap((palette) =>
      MODES.filter((mode) => {
        const s = swatchesOf(palette.modes![mode], mode)
        return toHex(inkOf(s)) !== toHex(s.accent2)
      }).map((mode) => `${palette.id}:${mode}`)
    )
    // A pale lilac, a coral and a gold, each on a light page. Every other
    // palette keeps the gradient it was drawn with.
    expect(moved).toEqual(["catedral:light", "roatan:light", "lempira:light"])

    // And no further than it takes: still closer to itself than to the accent.
    for (const id of ["catedral", "roatan", "lempira"]) {
      const s = swatchesOf(paletteOf(id).modes!.light, "light")
      const ink = inkOf(s)
      const distance = (a: typeof ink, b: typeof ink) =>
        Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
      expect(distance(ink, s.accent2)).toBeLessThan(distance(ink, s.accent))
    }
  })

  it("leave Medusa untouched for the classic palette", () => {
    const classic = paletteOf("clasico")
    expect(paletteTokens(classic, "dark")).toEqual({})
    expect(paletteCss(classic)).toBe("")
    expect(previewOf(classic, "light").card).toBe("rgba(255, 255, 255, 1)")
  })

  describe.each(themed.map((palette) => [palette.name, palette] as const))(
    "%s",
    (_name, palette) => {
      describe.each(MODES)("%s", (mode) => {
        const s = swatchesOf(palette.modes![mode], mode)
        // The primary button's label is white at 88%.
        const label = (fill: typeof s.fill) => mix(fill, WHITE, 0.88)

        it("reads: text on cards and on the page", () => {
          expect(contrast(s.ink, s.card)).toBeGreaterThanOrEqual(11)
          expect(contrast(s.ink, s.canvas)).toBeGreaterThanOrEqual(11)
          expect(contrast(s.inkSubtle, s.card)).toBeGreaterThanOrEqual(5.5)
          expect(contrast(s.inkSubtle, s.canvas)).toBeGreaterThanOrEqual(5)
          // Medusa's own muted text sits at 3.6:1 on a dark card.
          expect(contrast(s.inkMuted, s.card)).toBeGreaterThanOrEqual(3.6)
          expect(contrast(s.inkMuted, s.canvas)).toBeGreaterThanOrEqual(3.4)
        })

        it("reads: the accent as text, links and icons", () => {
          expect(contrast(s.accent, s.card)).toBeGreaterThanOrEqual(4.5)
          expect(contrast(s.accent, s.canvas)).toBeGreaterThanOrEqual(4.5)
          expect(contrast(s.accent, s.raised)).toBeGreaterThanOrEqual(4.5)
        })

        it("reads: the second accent where it is text, at the end of a big figure", () => {
          const ink = inkOf(s)
          expect(contrast(ink, s.card)).toBeGreaterThanOrEqual(LARGE_TEXT_CONTRAST)
          expect(contrast(ink, s.canvas)).toBeGreaterThanOrEqual(LARGE_TEXT_CONTRAST)
          // It is the second accent itself wherever that already read.
          const read =
            Math.min(contrast(s.accent2, s.card), contrast(s.accent2, s.canvas)) >=
            LARGE_TEXT_CONTRAST
          expect(toHex(ink) === toHex(s.accent2)).toBe(read)
          expect(paletteTokens(palette, mode)["--y2k-ink-2"]).toBe(toHex(ink))
          expect(previewOf(palette, mode).ink2).toBe(toHex(ink))
        })

        it("reads: white on the accent fill, at rest and hovered", () => {
          expect(contrast(label(s.fill), s.fill)).toBeGreaterThanOrEqual(4.5)
          expect(contrast(WHITE, s.fill)).toBeGreaterThanOrEqual(4.5)
          expect(contrast(label(s.fillHover), s.fillHover)).toBeGreaterThanOrEqual(3.6)
        })

        it("reads: text on a selected row", () => {
          expect(contrast(s.ink, s.highlight)).toBeGreaterThanOrEqual(9)
          expect(contrast(s.inkSubtle, s.highlight)).toBeGreaterThanOrEqual(4.5)
        })

        it("separates the page, the cards and what sits on them", () => {
          const step = (a: typeof s.card, b: typeof s.card) =>
            Math.abs(toOklch(a).l - toOklch(b).l)
          expect(step(s.card, s.canvas)).toBeGreaterThanOrEqual(0.012)
          expect(step(s.raised, s.card)).toBeGreaterThanOrEqual(0.012)
          expect(contrast(s.fill, s.card)).toBeGreaterThanOrEqual(3)
        })

        it("re-issues every Medusa shadow without a stock gray or blue left", () => {
          const tokens = paletteTokens(palette, mode)
          for (const name of Object.keys(MEDUSA_EFFECTS[mode])) {
            expect(tokens[name]).toBeDefined()
            // Layers and their alphas are kept: same count of colors.
            expect(tokens[name].split("rgba(").length).toBe(
              MEDUSA_EFFECTS[mode][name].split("rgba(").length
            )
            expect(tokens[name]).not.toMatch(
              /rgba\((39, 39, 42|24, 24, 27|82, 82, 91|96, 165, 250|59, 130, 246|37, 99, 235|30, 58, 138|219, 234, 254|228, 228, 231),/
            )
          }
        })

        it("only writes well-formed declarations", () => {
          for (const [name, value] of Object.entries(paletteTokens(palette, mode))) {
            expect(name).toMatch(/^--[a-z0-9-]+$/)
            expect(value).not.toMatch(/NaN|undefined|[{};]/)
          }
        })
      })

      it("is one stylesheet with a light and a dark block", () => {
        const css = paletteCss(palette)
        // Each side only where it belongs: a light block that also matched
        // in dark mode would leak its solid light colors into the dark panel.
        expect(css).toContain(`html:not(.dark)[data-y2k-palette="${palette.id}"]{`)
        expect(css).toContain(`html.dark[data-y2k-palette="${palette.id}"]{`)
        expect(css).not.toMatch(/(^|\n)html\[data-y2k-palette/)
        expect(css.split("{").length).toBe(3)
      })
    }
  )
})
