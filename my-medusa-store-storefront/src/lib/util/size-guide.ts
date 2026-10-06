/**
 * Everything the size guide, its size finder and the product-page size tab say
 * about sizing, so a measurement is corrected in one place and every surface
 * follows.
 *
 * Chest, waist and hip are body measurements; shirt and jogger length belong
 * to the garment. Only the S–XL chest, shirt length and height columns come
 * from the original guide. The XS/2XL rows and the waist, hip, weight and
 * jogger-length columns are extrapolated from it and have to be checked
 * against the physical garments before anyone relies on them.
 */

export type GarmentLine = "estandar" | "premium" | "jogger"

export type SizeCode = "XS" | "S" | "M" | "L" | "XL" | "2XL"

type Range = readonly [min: number, max: number]

export type SizeRow = {
  size: SizeCode
  /** Body, cm. */
  chest: Range
  waist: Range
  hip: Range
  /** Reference height, cm. Neighbouring sizes overlap. */
  height: Range
  weightKg: Range
  /** Garment, cm. */
  shirtLength: number
  joggerLength: number
}

export const SIZE_CHART: readonly SizeRow[] = [
  { size: "XS", chest: [81, 87], waist: [64, 70], hip: [83, 89], height: [155, 165], weightKg: [50, 59], shirtLength: 66, joggerLength: 98 },
  { size: "S", chest: [88, 94], waist: [71, 77], hip: [90, 96], height: [160, 170], weightKg: [60, 68], shirtLength: 68, joggerLength: 100 },
  { size: "M", chest: [95, 101], waist: [78, 84], hip: [97, 103], height: [168, 175], weightKg: [69, 77], shirtLength: 70, joggerLength: 102 },
  { size: "L", chest: [102, 108], waist: [85, 91], hip: [104, 110], height: [173, 180], weightKg: [78, 87], shirtLength: 72, joggerLength: 104 },
  { size: "XL", chest: [109, 116], waist: [92, 99], hip: [111, 117], height: [178, 188], weightKg: [88, 98], shirtLength: 74, joggerLength: 106 },
  { size: "2XL", chest: [117, 124], waist: [100, 107], hip: [118, 124], height: [183, 193], weightKg: [99, 110], shirtLength: 76, joggerLength: 108 },
]

const ALL_SIZES: SizeCode[] = SIZE_CHART.map((row) => row.size)

export const rowsFor = (sizes: readonly string[]): SizeRow[] =>
  SIZE_CHART.filter((row) => sizes.includes(row.size))

type Alternative = { label: string; offset: number }

export type LineInfo = {
  id: GarmentLine
  /** Section id on the guide, so product pages can deep-link to their line. */
  anchor: string
  name: string
  eyebrow: string
  fit: string
  /** Where the cut sits between compression (1) and baggy (5). */
  fitLevel: 1 | 2 | 3 | 4 | 5
  /** Sizes the line is made in; a single product may carry fewer. */
  sizes: SizeCode[]
  /** One-line answer to "what size do I order?". */
  rule: string
  /** Why, in a sentence — shown next to the rule on product pages. */
  reason: string
  /** Which neighbour to start from when a measurement falls between two sizes. */
  between: "lower" | "higher"
  /** What to do when a measurement sits at the boundary of two sizes. */
  betweenHint: string
  /** Sizes up (+) or down (−) from the body size the line is meant to be worn in. */
  offset: number
  /** Sizes worth showing next to the recommendation, relative to the body size. */
  alternatives: Alternative[]
}

export const LINES: Record<GarmentLine, LineInfo> = {
  estandar: {
    id: "estandar",
    anchor: "camisetas-estandar",
    name: "Camisetas de calidad estándar",
    eyebrow: "Calidad estándar",
    fit: "Medium Muscle Fit",
    fitLevel: 2,
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    rule: "Pide tu talla habitual",
    reason:
      "Corte Medium Muscle Fit: se ciñe al cuerpo sin apretar y la tela, de alta elasticidad, se adapta a ti.",
    between: "lower",
    betweenHint:
      "Con la tela elástica, la menor marca más y la mayor es más cómoda.",
    offset: 0,
    alternatives: [
      { label: "Si la quieres más ceñida", offset: -1 },
      { label: "Si la quieres más cómoda", offset: 1 },
    ],
  },
  premium: {
    id: "premium",
    anchor: "camisetas-premium",
    name: "Camisetas premium",
    eyebrow: "Calidad premium",
    fit: "Compresión ajustada",
    fitLevel: 1,
    sizes: ["M", "L", "XL"],
    rule: "Pide una talla más de la que usas",
    reason:
      "Corte de compresión ajustado en tela gruesa de elastano: con tu talla habitual queda al límite.",
    between: "higher",
    betweenHint:
      "En premium conviene la mayor para que no quede apretada de más.",
    offset: 1,
    alternatives: [
      { label: "Para la máxima compresión, tu talla habitual", offset: 0 },
    ],
  },
  jogger: {
    id: "jogger",
    anchor: "joggers",
    name: "Joggers y buzos",
    eyebrow: "Joggers y buzos",
    fit: "Baggy",
    fitLevel: 5,
    sizes: ["XS", "S", "M", "L", "XL"],
    rule: "Pide tu talla habitual",
    reason:
      "Corte baggy: pierna ancha y cintura elástica, hechos para quedar holgados.",
    between: "higher",
    betweenHint:
      "En joggers conviene la mayor para que cadera y muslos tengan espacio.",
    offset: 0,
    alternatives: [
      { label: "Si lo quieres menos holgado", offset: -1 },
      { label: "Si lo quieres oversize", offset: 1 },
    ],
  },
}

export const guideHref = (line: GarmentLine) =>
  `/guia-de-tallas#${LINES[line].anchor}`

/* ───────────────────────────── unit helpers ───────────────────────────── */

const KG_PER_LB = 0.45359237

export const cmToIn = (cm: number) => Math.round(cm / 2.54)
export const kgToLb = (kg: number) => Math.round(kg / KG_PER_LB)
export const lbToKg = (lb: number) => lb * KG_PER_LB
export const metersLabel = (cm: number) => (cm / 100).toFixed(2)
export const formatRange = ([min, max]: Range) => `${min} – ${max}`

/* ─────────────────────────── premium conversion ─────────────────────────── */

export type PremiumRow = {
  /** The size the shopper would normally wear. */
  usual: SizeCode
  chest: Range
  /** The premium size for comfortable compression (one up, within the line). */
  comfortable: SizeCode
  /** The premium size for maximum compression (the usual one, within the line). */
  maximum: SizeCode
}

/**
 * Premium is cut a size small, so the table shoppers need is "usual size →
 * premium size". XS and 2XL have no honest answer (premium starts at M and
 * ends at XL), so they are left out and the guide says so in words.
 */
export const premiumConversion = (): PremiumRow[] => {
  const { sizes, offset } = LINES.premium
  const first = ALL_SIZES.indexOf(sizes[0])
  const last = ALL_SIZES.indexOf(sizes[sizes.length - 1])
  const clamp = (index: number) => ALL_SIZES[Math.min(Math.max(index, first), last)]

  return SIZE_CHART.filter(
    (_, index) => index >= first - offset && index <= last
  ).map((row) => {
    const index = ALL_SIZES.indexOf(row.size)

    return {
      usual: row.size,
      chest: row.chest,
      comfortable: clamp(index + offset),
      maximum: clamp(index),
    }
  })
}

/* ──────────────────────────── size recommendation ──────────────────────────── */

export type Measurements = {
  chest?: number
  waist?: number
  hip?: number
  heightCm?: number
  weightKg?: number
}

export type Recommendation = {
  size: SizeCode
  alternatives: { label: string; size: SizeCode }[]
  notes: string[]
  /** True when it came from height and weight instead of a tape measure. */
  estimated: boolean
}

export type FinderResult =
  | ({ status: "ok" } & Recommendation)
  | { status: "incomplete" }
  | { status: "out-of-range"; what: string }

// A value this far past either end of the chart snaps to the end size; any
// further and the chart simply doesn't cover the person.
const SNAP_TOLERANCE = 2
// Within this of a boundary a shopper is, for practical purposes, between sizes.
const EDGE = 1

type Placement =
  | { kind: "in"; index: number; neighbour: number | null }
  | { kind: "gap"; lower: number; upper: number }
  | { kind: "out" }

const place = (value: number, pick: (row: SizeRow) => Range): Placement => {
  const last = SIZE_CHART.length - 1
  const firstMin = pick(SIZE_CHART[0])[0]
  const lastMax = pick(SIZE_CHART[last])[1]

  if (value < firstMin - SNAP_TOLERANCE || value > lastMax + SNAP_TOLERANCE) {
    return { kind: "out" }
  }
  if (value < firstMin) return { kind: "in", index: 0, neighbour: null }
  if (value > lastMax) return { kind: "in", index: last, neighbour: null }

  for (let i = 0; i <= last; i++) {
    const [min, max] = pick(SIZE_CHART[i])

    if (value >= min && value <= max) {
      const neighbour =
        i > 0 && value - min <= EDGE
          ? i - 1
          : i < last && max - value <= EDGE
            ? i + 1
            : null

      return { kind: "in", index: i, neighbour }
    }

    if (i < last && value > max && value < pick(SIZE_CHART[i + 1])[0]) {
      return { kind: "gap", lower: i, upper: i + 1 }
    }
  }

  return { kind: "out" }
}

type Resolved = {
  index: number
  /** The two sizes a measurement sits between; `gap` when it falls outside both ranges. */
  between: { pair: [number, number]; gap: boolean } | null
}

const resolve = (placement: Placement, policy: "lower" | "higher"): Resolved => {
  if (placement.kind === "gap") {
    return {
      index: policy === "lower" ? placement.lower : placement.upper,
      between: { pair: [placement.lower, placement.upper], gap: true },
    }
  }

  if (placement.kind === "in") {
    return {
      index: placement.index,
      between:
        placement.neighbour === null
          ? null
          : {
              pair: [
                Math.min(placement.index, placement.neighbour),
                Math.max(placement.index, placement.neighbour),
              ],
              gap: false,
            },
    }
  }

  return { index: 0, between: null }
}

const hasValue = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0

const tapeMeasures = (line: GarmentLine, m: Measurements) =>
  line === "jogger"
    ? [
        { what: "cintura", value: m.waist, pick: (row: SizeRow) => row.waist },
        { what: "cadera", value: m.hip, pick: (row: SizeRow) => row.hip },
      ]
    : [{ what: "pecho", value: m.chest, pick: (row: SizeRow) => row.chest }]

/**
 * Body size from height and weight. Weight sets the circumference; height only
 * moves the answer up when someone is far taller than their weight suggests,
 * because a long torso needs the length of the next size even if the chest
 * doesn't.
 */
const estimate = (m: Measurements): Resolved | "out" | null => {
  if (!hasValue(m.heightCm) || !hasValue(m.weightKg)) return null

  const byWeight = place(m.weightKg, (row) => row.weightKg)
  if (byWeight.kind === "out") return "out"

  const weight = resolve(byWeight, "lower")
  let tallest = 0
  SIZE_CHART.forEach((row, i) => {
    if (m.heightCm! >= row.height[0]) tallest = i
  })

  const taller = tallest - weight.index >= 2

  return {
    index: Math.min(weight.index + (taller ? 1 : 0), SIZE_CHART.length - 1),
    between: weight.between,
  }
}

const sizeAt = (index: number) => SIZE_CHART[index].size

const clampNote = (
  line: GarmentLine,
  side: "low" | "high",
  bodyIndex: number,
  maxIndex: number
): string | null => {
  if (line === "premium" && side === "low") {
    return "La línea premium empieza en M. Es la más cercana a tu medida, pero puede quedarte algo suelta: la línea estándar te va a marcar mejor."
  }

  if (line === "premium" && side === "high") {
    return bodyIndex > maxIndex
      ? "La línea premium llega hasta XL y con tu medida va a quedar muy ajustada. La línea estándar llega hasta 2XL."
      : "XL es la talla más grande de la premium, así que tendrás la máxima compresión."
  }

  if (line === "jogger" && side === "high") {
    return "Los joggers llegan hasta XL; con tu medida van a quedar menos holgados de lo normal. Escríbenos y te ayudamos."
  }

  return null
}

export const recommendSize = (
  line: GarmentLine,
  measurements: Measurements
): FinderResult => {
  const info = LINES[line]
  const notes: string[] = []

  const taken = tapeMeasures(line, measurements).filter(({ value }) =>
    hasValue(value)
  )

  let base: Resolved
  let estimated = false

  if (taken.length) {
    const resolved: Resolved[] = []

    for (const { what, value, pick } of taken) {
      const placement = place(value as number, pick)

      if (placement.kind === "out") return { status: "out-of-range", what }

      resolved.push(resolve(placement, info.between))
    }

    base = resolved.reduce((a, b) => (b.index > a.index ? b : a))
  } else {
    const guess = estimate(measurements)

    if (guess === null) return { status: "incomplete" }
    if (guess === "out") return { status: "out-of-range", what: "peso" }

    base = guess
    estimated = true
  }

  if (base.between) {
    const [lower, upper] = base.between.pair
    const pair = `${sizeAt(lower)} y ${sizeAt(upper)}`

    notes.push(
      base.between.gap
        ? `Tu medida queda entre ${pair} en la tabla; usamos la ${sizeAt(base.index)} como punto de partida. ${info.betweenHint}`
        : `Estás cerca del límite entre ${pair}. ${info.betweenHint}`
    )
  }

  const indices = info.sizes.map((size) => ALL_SIZES.indexOf(size))
  const minIndex = Math.min.apply(null, indices)
  const maxIndex = Math.max.apply(null, indices)

  const wanted = base.index + info.offset
  const target = Math.min(Math.max(wanted, minIndex), maxIndex)

  if (target !== wanted) {
    const side = wanted < minIndex ? "low" : "high"
    const note = clampNote(line, side, base.index, maxIndex)

    if (note) notes.push(note)
  }

  const alternatives = info.alternatives
    .map(({ label, offset }) => ({ label, index: base.index + offset }))
    .filter(
      ({ index }) =>
        index !== target && index >= minIndex && index <= maxIndex
    )
    .map(({ label, index }) => ({ label, size: sizeAt(index) }))

  if (estimated) {
    notes.push(
      "Es una estimación con tu estatura y peso. Con cinta métrica el resultado es más exacto."
    )
  }

  return {
    status: "ok",
    size: sizeAt(target),
    alternatives,
    notes,
    estimated,
  }
}
