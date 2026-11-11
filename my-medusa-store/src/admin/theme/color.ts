/**
 * Color math for the admin's palettes. Surfaces and text are described in
 * OKLCH (lightness, chroma, hue), because equal steps of lightness there look
 * equal to the eye in every hue: one set of lightness steps can then serve a
 * violet palette and a green one alike. Everything is turned into plain sRGB
 * before it reaches CSS, so no browser has to understand `oklch()`.
 *
 * Pure functions, no DOM: the palettes are unit-tested for contrast with them.
 */

export type Rgb = { r: number; g: number; b: number }

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

const fromLinear = (channel: number) =>
  channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055

/** OKLab → linear sRGB (Björn Ottosson's matrices). May fall outside 0..1. */
const oklabToLinear = (L: number, a: number, b: number): Rgb => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

const inGamut = ({ r, g, b }: Rgb) =>
  r >= -0.0005 && r <= 1.0005 && g >= -0.0005 && g <= 1.0005 && b >= -0.0005 && b <= 1.0005

/**
 * An OKLCH color as sRGB (0..1 per channel). A color too vivid for the screen
 * keeps its lightness and hue and gives up chroma until it fits, which is
 * what the eye forgives most.
 */
export const oklch = (lightness: number, chroma: number, hue: number): Rgb => {
  const L = clamp01(lightness)
  const radians = (hue * Math.PI) / 180
  const at = (c: number) =>
    oklabToLinear(L, c * Math.cos(radians), c * Math.sin(radians))

  let linear = at(chroma)
  if (!inGamut(linear)) {
    let low = 0
    let high = chroma
    for (let i = 0; i < 18; i++) {
      const middle = (low + high) / 2
      if (inGamut(at(middle))) {
        low = middle
      } else {
        high = middle
      }
    }
    linear = at(low)
  }

  return {
    r: clamp01(fromLinear(clamp01(linear.r))),
    g: clamp01(fromLinear(clamp01(linear.g))),
    b: clamp01(fromLinear(clamp01(linear.b))),
  }
}

/** sRGB → OKLCH, to move an existing brand color lighter or darker. */
export const toOklch = ({ r, g, b }: Rgb): { l: number; c: number; h: number } => {
  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const hue = (Math.atan2(B, A) * 180) / Math.PI
  return { l: L, c: Math.hypot(A, B), h: hue < 0 ? hue + 360 : hue }
}

export const parseHex = (hex: string): Rgb => {
  const value = hex.replace("#", "")
  const full =
    value.length === 3
      ? value
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : value
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  }
}

const byte = (channel: number) => Math.round(clamp01(channel) * 255)

export const toHex = ({ r, g, b }: Rgb): string =>
  "#" + [r, g, b].map((channel) => byte(channel).toString(16).padStart(2, "0")).join("")

/** `rgba(r, g, b, a)`, the form Medusa's own tokens use. */
export const rgba = ({ r, g, b }: Rgb, alpha = 1): string =>
  `rgba(${byte(r)}, ${byte(g)}, ${byte(b)}, ${alpha})`

/** The three channels alone, for swapping the color inside a shadow. */
export const channels = ({ r, g, b }: Rgb): string =>
  `${byte(r)}, ${byte(g)}, ${byte(b)}`

/** A straight blend in sRGB: `amount` of `b` over `a`. */
export const mix = (a: Rgb, b: Rgb, amount: number): Rgb => ({
  r: a.r + (b.r - a.r) * amount,
  g: a.g + (b.g - a.g) * amount,
  b: a.b + (b.b - a.b) * amount,
})

/** The same hue and chroma at another lightness (delta in OKLCH lightness). */
export const shift = (color: Rgb, delta: number): Rgb => {
  const { l, c, h } = toOklch(color)
  return oklch(l + delta, c, h)
}

/** WCAG relative luminance. */
export const luminance = ({ r, g, b }: Rgb): number =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

/** WCAG contrast ratio between two colors, 1 to 21. */
export const contrast = (a: Rgb, b: Rgb): number => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
