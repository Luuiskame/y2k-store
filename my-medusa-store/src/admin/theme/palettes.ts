import {
  Rgb,
  channels,
  mix,
  oklch,
  parseHex,
  rgba,
  shift,
  toHex,
} from "./color"
import { MEDUSA_EFFECTS, MEDUSA_PREVIEW } from "./medusa-tokens"

/**
 * The admin's palettes and type sets ("Ajustes → Apariencia").
 *
 * A palette is not a list of ninety colors. It is a handful of decisions per
 * mode (how dark the page is, how much it leans to a hue, and three accents),
 * and `paletteTokens` derives from them every color token Medusa UI reads:
 * surfaces, text, borders, buttons, focus rings and card outlines. All
 * palettes therefore share the same lightness steps and the same contrast
 * guarantees (checked in `src/lib/__tests__/admin-theme.unit.spec.ts`), and a
 * new one is a dozen lines.
 *
 * Each palette has a light and a dark side: Medusa's own light/dark/system
 * switch (in the user menu) keeps working and picks between them.
 */

export type Mode = "dark" | "light"

export type FontSetId =
  | "gotica"
  | "moderna"
  | "atletica"
  | "cyber"
  | "editorial"
  | "terminal"
  | "clasica"

/** Its name and one line of character are words: i18n/dict/appearance.ts. */
export type FontSet = {
  id: FontSetId
  /** Headings and big numbers. */
  display: string
  body: string
  /** `font-weight` of headings. */
  weight: number
  /** `letter-spacing` of headings. */
  tracking: string
  /** `text-transform` of headings. */
  transform: "none" | "uppercase"
  /** How much bigger headings are set, to even out faces that run small. */
  scale: number
}

const SANS_FALLBACK = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
const SERIF_FALLBACK = `ui-serif, Georgia, "Times New Roman", serif`
const MONO_FALLBACK = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

export const FONT_SETS: FontSet[] = [
  {
    id: "gotica",
    display: `"Cinzel", ${SERIF_FALLBACK}`,
    body: `"Manrope", ${SANS_FALLBACK}`,
    weight: 600,
    tracking: "0.045em",
    transform: "none",
    scale: 1,
  },
  {
    id: "moderna",
    display: `"Manrope", ${SANS_FALLBACK}`,
    body: `"Manrope", ${SANS_FALLBACK}`,
    weight: 800,
    tracking: "-0.025em",
    transform: "none",
    scale: 1.06,
  },
  {
    id: "atletica",
    display: `"Big Shoulders Display", "Arial Narrow", ${SANS_FALLBACK}`,
    body: `"Manrope", ${SANS_FALLBACK}`,
    weight: 800,
    tracking: "0.03em",
    transform: "uppercase",
    scale: 1.3,
  },
  {
    id: "cyber",
    display: `"Unbounded", ${SANS_FALLBACK}`,
    body: `"Space Grotesk", ${SANS_FALLBACK}`,
    weight: 600,
    tracking: "-0.02em",
    transform: "none",
    scale: 0.92,
  },
  {
    id: "editorial",
    display: `"Instrument Serif", ${SERIF_FALLBACK}`,
    body: `"Manrope", ${SANS_FALLBACK}`,
    weight: 400,
    tracking: "-0.01em",
    transform: "none",
    scale: 1.32,
  },
  {
    id: "terminal",
    display: `"JetBrains Mono", ${MONO_FALLBACK}`,
    body: `"JetBrains Mono", ${MONO_FALLBACK}`,
    weight: 700,
    tracking: "-0.03em",
    transform: "none",
    scale: 0.96,
  },
  {
    id: "clasica",
    display: `Inter, ${SANS_FALLBACK}`,
    body: `Inter, ${SANS_FALLBACK}`,
    weight: 500,
    tracking: "0",
    transform: "none",
    scale: 1,
  },
]

export const fontSetOf = (id: string | null | undefined): FontSet =>
  FONT_SETS.find((set) => set.id === id) ?? FONT_SETS[0]

/* -------------------------------------------------------------------------- */

export type ModeSpec = {
  /** Hue the neutrals lean to, in degrees. */
  hue: number
  /** How much they lean (OKLCH chroma): 0 is pure gray. */
  tint: number
  /** Lightness of the page behind the cards. */
  canvas: number
  /**
   * Light mode only: cards on tinted paper instead of pure white, for the
   * warm palettes.
   */
  paper?: boolean
  /** The accent as text and icons on a surface (links, active items). */
  accent: string
  /** The accent as a fill that carries white text (primary button, switch). */
  fill: string
  /** Second accent: gradients, the glow, the comparison series in charts. */
  accent2: string
}

export type PaletteId =
  | "catedral"
  | "winter"
  | "cine"
  | "tokio"
  | "roatan"
  | "copan"
  | "guacamaya"
  | "lempira"
  | "terminal"
  | "chicle"
  | "cafe"
  | "clasico"

export type Palette = {
  id: PaletteId
  /**
   * A proper name, the same in both languages. The few words of personality
   * under it are translated: i18n/dict/appearance.ts.
   */
  name: string
  /** The type set that completes it, used while "Según la paleta" is on. */
  font: FontSetId
  /** null: Medusa's stock colors, nothing overridden. */
  modes: Record<Mode, ModeSpec> | null
}

export const PALETTES: Palette[] = [
  {
    id: "catedral",
    name: "Catedral",
    font: "gotica",
    modes: {
      // The storefront's own colors: Void Black, Abyss Purple, Sacred Violet,
      // Violet Deep under white text, Divine Lilac where it must read.
      dark: { hue: 300, tint: 0.034, canvas: 0.15, accent: "#C084FC", fill: "#8E42BD", accent2: "#A855F7" },
      light: { hue: 300, tint: 0.012, canvas: 0.972, accent: "#7E22CE", fill: "#8E42BD", accent2: "#C084FC" },
    },
  },
  {
    // The season of "locking in" (October to December): frost on steel, and
    // the scoreboard type. Blue is the one hue no other palette leads with.
    id: "winter",
    name: "Winter Arc",
    font: "atletica",
    modes: {
      dark: { hue: 245, tint: 0.03, canvas: 0.15, accent: "#7DD3FC", fill: "#1C63CC", accent2: "#E0F2FE" },
      light: { hue: 240, tint: 0.01, canvas: 0.972, accent: "#0B5CAD", fill: "#1C63CC", accent2: "#0284C7" },
    },
  },
  {
    // "Cine": what is said of anything that came out perfect. Film stock,
    // no hue at all in the neutrals, and one red.
    id: "cine",
    name: "Cine",
    font: "editorial",
    modes: {
      dark: { hue: 60, tint: 0.004, canvas: 0.13, accent: "#FF5A52", fill: "#C8102E", accent2: "#F4F1EA" },
      light: { hue: 60, tint: 0.004, canvas: 0.965, accent: "#B00020", fill: "#C8102E", accent2: "#1C1917" },
    },
  },
  {
    id: "tokio",
    name: "Neón Tokio",
    font: "cyber",
    modes: {
      dark: { hue: 268, tint: 0.032, canvas: 0.165, accent: "#FF6FB5", fill: "#C80070", accent2: "#22D3EE" },
      light: { hue: 268, tint: 0.008, canvas: 0.972, accent: "#C20F6E", fill: "#C80070", accent2: "#0891B2" },
    },
  },
  {
    id: "roatan",
    name: "Roatán",
    font: "moderna",
    modes: {
      dark: { hue: 218, tint: 0.036, canvas: 0.185, accent: "#2DD4BF", fill: "#0F766E", accent2: "#FB7185" },
      light: { hue: 85, tint: 0.014, canvas: 0.965, paper: true, accent: "#0F6E66", fill: "#0F766E", accent2: "#F0624D" },
    },
  },
  {
    id: "copan",
    name: "Copán",
    font: "editorial",
    modes: {
      dark: { hue: 155, tint: 0.018, canvas: 0.185, accent: "#4ADEAB", fill: "#047857", accent2: "#E0B15A" },
      light: { hue: 95, tint: 0.016, canvas: 0.962, paper: true, accent: "#046C4E", fill: "#047857", accent2: "#B7791F" },
    },
  },
  {
    id: "guacamaya",
    name: "Guacamaya",
    font: "atletica",
    modes: {
      dark: { hue: 258, tint: 0.042, canvas: 0.172, accent: "#FF7A6B", fill: "#CC1B11", accent2: "#FACC15" },
      light: { hue: 258, tint: 0.007, canvas: 0.972, accent: "#C81E1E", fill: "#CC1B11", accent2: "#1D4ED8" },
    },
  },
  {
    id: "lempira",
    name: "Lempira",
    font: "gotica",
    modes: {
      dark: { hue: 85, tint: 0.008, canvas: 0.148, accent: "#E9C46A", fill: "#8C6300", accent2: "#F6E7B4" },
      light: { hue: 88, tint: 0.018, canvas: 0.962, paper: true, accent: "#775300", fill: "#856000", accent2: "#C9A227" },
    },
  },
  {
    id: "terminal",
    name: "Terminal",
    font: "terminal",
    modes: {
      dark: { hue: 150, tint: 0.014, canvas: 0.14, accent: "#4ADE80", fill: "#077A37", accent2: "#A3E635" },
      light: { hue: 140, tint: 0.01, canvas: 0.968, accent: "#166534", fill: "#077A37", accent2: "#4D7C0F" },
    },
  },
  {
    id: "chicle",
    name: "Chicle",
    font: "moderna",
    modes: {
      dark: { hue: 342, tint: 0.04, canvas: 0.185, accent: "#F9A8D4", fill: "#C61F5E", accent2: "#7DD3FC" },
      light: { hue: 345, tint: 0.02, canvas: 0.968, accent: "#B5174F", fill: "#C61F5E", accent2: "#0284C7" },
    },
  },
  {
    id: "cafe",
    name: "Café Marcala",
    font: "editorial",
    modes: {
      dark: { hue: 55, tint: 0.024, canvas: 0.172, accent: "#E8B273", fill: "#B7413A", accent2: "#F0704F" },
      light: { hue: 72, tint: 0.024, canvas: 0.955, paper: true, accent: "#8A3A16", fill: "#9A3412", accent2: "#B4232A" },
    },
  },
  {
    id: "clasico",
    name: "Medusa clásico",
    font: "clasica",
    modes: null,
  },
]

export const DEFAULT_PALETTE: PaletteId = "catedral"

export const paletteOf = (id: string | null | undefined): Palette =>
  PALETTES.find((palette) => palette.id === id) ??
  PALETTES.find((palette) => palette.id === DEFAULT_PALETTE)!

/* -------------------------------------------------------------------------- */
/* From a spec to colors                                                      */
/* -------------------------------------------------------------------------- */

/** The resolved colors of a palette in one mode, by role. */
export type Swatches = {
  canvas: Rgb
  card: Rgb
  raised: Rgb
  pressed: Rgb
  ink: Rgb
  inkSubtle: Rgb
  inkMuted: Rgb
  inkDisabled: Rgb
  line: Rgb
  lineStrong: Rgb
  accent: Rgb
  accentHover: Rgb
  fill: Rgb
  fillHover: Rgb
  fillPressed: Rgb
  accent2: Rgb
  highlight: Rgb
  highlightHover: Rgb
  /** Tooltips and other inverted surfaces. */
  contrast: Rgb
  contrastHover: Rgb
  contrastPressed: Rgb
}

const WHITE: Rgb = { r: 1, g: 1, b: 1 }
const BLACK: Rgb = { r: 0, g: 0, b: 0 }

export const swatchesOf = (spec: ModeSpec, mode: Mode): Swatches => {
  const { hue, tint, canvas } = spec
  const accent = parseHex(spec.accent)
  const fill = parseHex(spec.fill)
  const tone = (lightness: number, strength = 1) =>
    oklch(lightness, tint * strength, hue)

  if (mode === "dark") {
    const card = tone(canvas + 0.04)
    return {
      canvas: tone(canvas),
      card,
      raised: tone(canvas + 0.068),
      pressed: tone(canvas + 0.14),
      ink: tone(0.96, 0.35),
      inkSubtle: tone(0.76, 0.5),
      inkMuted: tone(0.6, 0.6),
      inkDisabled: tone(0.44, 0.6),
      // Lines on dark are translucent white in Medusa; these are their solid
      // equivalents over a card, for the places that need an opaque color.
      line: mix(card, WHITE, 0.08),
      lineStrong: mix(card, WHITE, 0.16),
      accent,
      accentHover: shift(accent, 0.06),
      fill,
      fillHover: shift(fill, 0.04),
      fillPressed: shift(fill, 0.08),
      accent2: parseHex(spec.accent2),
      highlight: mix(card, fill, 0.26),
      highlightHover: mix(card, fill, 0.38),
      contrast: tone(canvas + 0.068),
      contrastHover: tone(canvas + 0.14),
      contrastPressed: tone(canvas + 0.2),
    }
  }

  const card = spec.paper ? tone(0.988, 0.45) : WHITE
  return {
    canvas: tone(canvas),
    card,
    raised: tone(canvas - 0.018),
    pressed: tone(canvas - 0.06),
    ink: tone(0.21, 1.4),
    inkSubtle: tone(0.43, 1.2),
    inkMuted: tone(0.54, 1),
    inkDisabled: tone(0.72, 0.8),
    line: tone(canvas - 0.06),
    lineStrong: tone(canvas - 0.105),
    accent,
    accentHover: shift(accent, -0.06),
    fill,
    fillHover: shift(fill, 0.05),
    fillPressed: shift(fill, -0.05),
    accent2: parseHex(spec.accent2),
    highlight: mix(card, fill, 0.09),
    highlightHover: mix(card, fill, 0.16),
    contrast: tone(0.21, 1.6),
    contrastHover: tone(0.28, 1.6),
    contrastPressed: tone(0.38, 1.4),
  }
}

/* -------------------------------------------------------------------------- */
/* From colors to Medusa UI tokens                                            */
/* -------------------------------------------------------------------------- */

const colorTokens = (s: Swatches, mode: Mode): Record<string, string> => {
  const shared = {
    "--bg-subtle": rgba(s.canvas),
    "--bg-base": rgba(s.card),
    "--bg-base-pressed": rgba(s.pressed),
    "--bg-subtle-pressed": rgba(mode === "dark" ? s.raised : s.pressed),
    "--bg-field-component": rgba(s.card),
    "--bg-highlight": rgba(s.highlight),
    "--bg-highlight-hover": rgba(s.highlightHover),
    "--bg-interactive": rgba(s.fill),
    "--bg-switch-off": rgba(s.pressed),
    "--fg-base": rgba(s.ink),
    "--fg-subtle": rgba(s.inkSubtle),
    "--fg-muted": rgba(s.inkMuted),
    "--fg-disabled": rgba(s.inkDisabled),
    "--fg-interactive": rgba(s.accent),
    "--fg-interactive-hover": rgba(s.accentHover),
    "--border-interactive": rgba(s.accent),
    "--button-inverted": rgba(s.fill),
    "--button-inverted-hover": rgba(s.fillHover),
    "--button-inverted-pressed": rgba(s.fillPressed),
    "--contrast-bg-base": rgba(s.contrast),
    "--contrast-bg-base-hover": rgba(s.contrastHover),
    "--contrast-bg-base-pressed": rgba(s.contrastPressed),
    "--tag-neutral-text": rgba(s.inkSubtle),
    "--tag-neutral-icon": rgba(s.inkMuted),
  }

  if (mode === "dark") {
    return {
      ...shared,
      "--bg-base-hover": rgba(s.raised),
      "--bg-subtle-hover": rgba(s.card),
      "--bg-component": rgba(s.raised),
      "--bg-field-component-hover": rgba(s.raised),
      "--bg-disabled": rgba(s.raised),
      "--bg-switch-off-hover": rgba(shift(s.pressed, 0.06)),
      "--bg-overlay": rgba(s.canvas, 0.72),
      "--fg-on-inverted": rgba(s.canvas),
      "--border-menu-top": rgba(s.card),
      "--contrast-border-top": rgba(s.card),
    }
  }

  return {
    ...shared,
    "--bg-base-hover": rgba(s.raised),
    "--bg-subtle-hover": rgba(s.raised),
    "--bg-component": rgba(s.canvas),
    "--bg-component-hover": rgba(s.raised),
    "--bg-component-pressed": rgba(s.pressed),
    "--bg-field": rgba(s.canvas),
    "--bg-field-hover": rgba(s.raised),
    "--bg-field-component-hover": rgba(s.canvas),
    "--bg-disabled": rgba(s.raised),
    "--bg-switch-off-hover": rgba(s.lineStrong),
    "--bg-overlay": rgba(s.contrast, 0.4),
    "--border-base": rgba(s.line),
    "--border-strong": rgba(s.lineStrong),
    "--border-menu-top": rgba(s.line),
    "--button-neutral": rgba(s.card),
    "--button-neutral-hover": rgba(s.raised),
    "--button-neutral-pressed": rgba(s.pressed),
    "--button-transparent-hover": rgba(s.raised),
    "--button-transparent-pressed": rgba(s.pressed),
    "--contrast-bg-subtle": rgba(s.contrastHover),
    "--contrast-border-top": rgba(s.contrast),
    "--tag-neutral-bg": rgba(s.raised),
    "--tag-neutral-bg-hover": rgba(s.pressed),
    "--tag-neutral-border": rgba(s.line),
    "--alpha-250": rgba(s.contrast, 0.1),
    "--alpha-400": rgba(s.contrast, 0.24),
  }
}

/**
 * Medusa's shadow tokens with this palette's colors in place of the stock
 * grays and blues. The stock value is matched by its three channels, so the
 * alpha of each layer is kept as Medusa wrote it.
 */
const effectTokens = (s: Swatches, mode: Mode): Record<string, string> => {
  const pale = mix(s.accent, WHITE, 0.7)
  const deep = mix(s.fill, BLACK, 0.45)

  const swaps = (name: string): [string, Rgb][] =>
    mode === "dark"
      ? [
          ["39, 39, 42", s.raised],
          ["24, 24, 27", s.canvas],
          ["82, 82, 91", s.fill],
          ["96, 165, 250", s.accent],
          ["59, 130, 246", s.accent],
          ["219, 234, 254", pale],
          ["30, 58, 138", deep],
        ]
      : [
          // On the primary button the near-black is its own edge; elsewhere
          // it is the ink of an inverted surface.
          ["24, 24, 27", name.startsWith("--buttons-inverted") ? mix(s.fill, BLACK, 0.25) : s.contrast],
          ["39, 39, 42", s.contrastHover],
          ["228, 228, 231", s.line],
          ["59, 130, 246", s.fill],
          ["37, 99, 235", s.fill],
          ["30, 58, 138", deep],
        ]

  return Object.fromEntries(
    Object.entries(MEDUSA_EFFECTS[mode]).map(([name, value]) => [
      name,
      swaps(name).reduce(
        (shadow, [from, to]) =>
          shadow.split(`rgba(${from},`).join(`rgba(${channels(to)},`),
        value
      ),
    ])
  )
}

/** What the admin's own components read, on top of Medusa's tokens. */
const ownTokens = (s: Swatches, mode: Mode): Record<string, string> => ({
  "--y2k-accent": toHex(s.accent),
  "--y2k-accent-2": toHex(s.accent2),
  "--y2k-fill": toHex(s.fill),
  "--y2k-canvas": toHex(s.canvas),
  "--y2k-glow": rgba(s.accent, mode === "dark" ? 0.38 : 0.22),
  "--y2k-wash": rgba(s.accent, mode === "dark" ? 0.14 : 0.1),
  "--y2k-aura": [
    `radial-gradient(60rem 34rem at 100% -8%, ${rgba(s.accent, mode === "dark" ? 0.17 : 0.11)}, transparent 62%)`,
    `radial-gradient(44rem 30rem at 108% 104%, ${rgba(s.accent2, mode === "dark" ? 0.1 : 0.08)}, transparent 60%)`,
  ].join(", "),
})

/** Every CSS custom property a palette sets in one mode. */
export const paletteTokens = (
  palette: Palette,
  mode: Mode
): Record<string, string> => {
  if (!palette.modes) {
    return {}
  }
  const swatches = swatchesOf(palette.modes[mode], mode)
  return {
    ...colorTokens(swatches, mode),
    ...effectTokens(swatches, mode),
    ...ownTokens(swatches, mode),
  }
}

const block = (selector: string, tokens: Record<string, string>): string =>
  `${selector}{${Object.entries(tokens)
    .map(([name, value]) => `${name}:${value}`)
    .join(";")}}`

/**
 * The stylesheet of a palette. The selectors out-rank Medusa's `:root` and
 * `.dark` blocks whatever order the two stylesheets load in.
 *
 * The light block excludes `.dark` on purpose. The two sides do not set the
 * same tokens (dark keeps Medusa's translucent whites for borders, fields and
 * secondary buttons), so a light block that also matched in dark mode would
 * leak its solid light colors into it: white buttons on a black page.
 */
export const paletteCss = (palette: Palette): string =>
  palette.modes
    ? [
        block(`html:not(.dark)[data-y2k-palette="${palette.id}"]`, paletteTokens(palette, "light")),
        block(`html.dark[data-y2k-palette="${palette.id}"]`, paletteTokens(palette, "dark")),
      ].join("\n")
    : ""

/** The few colors a palette's preview card is drawn with. */
export type Preview = {
  canvas: string
  card: string
  raised: string
  ink: string
  inkSubtle: string
  line: string
  accent: string
  fill: string
  accent2: string
}

export const previewOf = (palette: Palette, mode: Mode): Preview => {
  if (!palette.modes) {
    const stock = MEDUSA_PREVIEW[mode]
    return {
      canvas: stock["--bg-subtle"],
      card: stock["--bg-base"],
      raised: stock["--bg-component"],
      ink: stock["--fg-base"],
      inkSubtle: stock["--fg-subtle"],
      line: stock["--border-base"],
      accent: stock["--fg-interactive"],
      fill: stock["--button-inverted"],
      accent2: stock["--fg-muted"],
    }
  }
  const s = swatchesOf(palette.modes[mode], mode)
  return {
    canvas: toHex(s.canvas),
    card: toHex(s.card),
    raised: toHex(s.raised),
    ink: toHex(s.ink),
    inkSubtle: toHex(s.inkSubtle),
    line: toHex(s.line),
    accent: toHex(s.accent),
    fill: toHex(s.fill),
    accent2: toHex(s.accent2),
  }
}
