"use client"

import { whatsappLink } from "@lib/config/brand"
import {
  GarmentLine,
  LINES,
  Measurements,
  lbToKg,
  recommendSize,
} from "@lib/util/size-guide"
import FilterChip from "@modules/common/components/filter-chip"
import { useMemo, useState } from "react"

/** Models in stock per size, per line. Missing means "we don't know". */
export type LineAvailability = Partial<
  Record<GarmentLine, Record<string, number>>
>

type SizeFinderProps = {
  availability?: LineAvailability
}

type Method = "tape" | "estimate"
type WeightUnit = "lb" | "kg"

const LINE_ORDER: GarmentLine[] = ["estandar", "premium", "jogger"]

const LINE_LABEL: Record<GarmentLine, string> = {
  estandar: "Camiseta estándar",
  premium: "Camiseta premium",
  jogger: "Jogger o buzo",
}

// Outside these a number is a typo, not a body: the field says so instead of
// the finder answering a question nobody asked.
const WINDOW = {
  chest: [60, 160],
  waist: [50, 150],
  hip: [60, 170],
  height: [120, 220],
  weightKg: [30, 200],
} as const

const parse = (raw: string): number | undefined => {
  const value = Number.parseFloat(raw.replace(",", "."))

  return Number.isFinite(value) ? value : undefined
}

/** "1.75" is how people here say their height; read it as metres. */
const parseHeight = (raw: string): number | undefined => {
  const value = parse(raw)

  return value !== undefined && value >= 1.2 && value <= 2.4
    ? Math.round(value * 100)
    : value
}

const inside = (value: number | undefined, [min, max]: readonly [number, number]) =>
  value !== undefined && value >= min && value <= max

const sanitize = (raw: string) => raw.replace(/[^0-9.,]/g, "")

type FieldProps = {
  id: string
  label: string
  unit: string
  hint: string
  value: string
  error?: string | null
  optional?: boolean
  onChange: (value: string) => void
}

const Field = ({
  id,
  label,
  unit,
  hint,
  value,
  error,
  optional,
  onChange,
}: FieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-xs uppercase tracking-[0.14em] text-brand-silver-ash"
    >
      {label}
      {optional && <span className="normal-case tracking-normal"> (opcional)</span>}
    </label>
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(sanitize(event.target.value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        className="block h-11 w-full rounded-md border bg-brand-void-black pl-4 pr-12 text-brand-ghost-white caret-[var(--brand-divine-lilac)] transition-colors focus:outline-none focus:shadow-[0_0_0_2px_rgba(155,77,202,0.25)]"
        style={{
          borderColor: error
            ? "var(--brand-divine-lilac)"
            : "var(--brand-amethyst)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-brand-silver-ash"
      >
        {unit}
      </span>
    </div>
    <p
      id={`${id}-hint`}
      className={`min-h-[1rem] text-xs ${error ? "text-brand-divine-lilac" : "text-brand-silver-ash/80"}`}
    >
      {error ?? hint}
    </p>
  </div>
)

const SizeFinder = ({ availability }: SizeFinderProps) => {
  const [line, setLine] = useState<GarmentLine>("estandar")
  const [method, setMethod] = useState<Method>("tape")
  const [chest, setChest] = useState("")
  const [waist, setWaist] = useState("")
  const [hip, setHip] = useState("")
  const [height, setHeight] = useState("")
  const [weight, setWeight] = useState("")
  const [unit, setUnit] = useState<WeightUnit>("lb")

  const info = LINES[line]
  const tape = method === "tape"

  const typedWeight = parse(weight)

  const values = {
    chest: parse(chest),
    waist: parse(waist),
    hip: parse(hip),
    heightCm: parseHeight(height),
    weightKg:
      typedWeight !== undefined && unit === "lb"
        ? lbToKg(typedWeight)
        : typedWeight,
  }

  const errors = {
    chest:
      chest && !inside(values.chest, WINDOW.chest)
        ? "Escribe tu pecho en centímetros, por ejemplo 98."
        : null,
    waist:
      waist && !inside(values.waist, WINDOW.waist)
        ? "Escribe tu cintura en centímetros, por ejemplo 80."
        : null,
    hip:
      hip && !inside(values.hip, WINDOW.hip)
        ? "Escribe tu cadera en centímetros, por ejemplo 98."
        : null,
    height:
      height && !inside(values.heightCm, WINDOW.height)
        ? "Escribe tu estatura en centímetros (175) o metros (1.75)."
        : null,
    weight:
      weight && !inside(values.weightKg, WINDOW.weightKg)
        ? `Escribe tu peso en ${unit === "lb" ? "libras, por ejemplo 165" : "kilos, por ejemplo 75"}.`
        : null,
  }

  // Only valid numbers reach the recommendation, so a half-typed "9" in the
  // chest field never flashes a size.
  const measurements: Measurements = useMemo(() => {
    const keep = (value: number | undefined, window: readonly [number, number]) =>
      inside(value, window) ? value : undefined

    return tape
      ? line === "jogger"
        ? {
            waist: keep(values.waist, WINDOW.waist),
            hip: keep(values.hip, WINDOW.hip),
          }
        : { chest: keep(values.chest, WINDOW.chest) }
      : {
          heightCm: keep(values.heightCm, WINDOW.height),
          weightKg: keep(values.weightKg, WINDOW.weightKg),
        }
  }, [
    tape,
    line,
    values.waist,
    values.hip,
    values.chest,
    values.heightCm,
    values.weightKg,
  ])

  const result = useMemo(
    () => recommendSize(line, measurements),
    [line, measurements]
  )

  const stock = availability?.[line]
  const sizesInStock = stock
    ? Object.keys(stock).filter((size) => stock[size] > 0)
    : null

  const whatsappHref =
    result.status === "ok"
      ? whatsappLink(
          [
            "Hola, quiero confirmar mi talla.",
            `Prenda: ${info.name}`,
            measurements.chest ? `Pecho: ${measurements.chest} cm` : "",
            measurements.waist ? `Cintura: ${measurements.waist} cm` : "",
            measurements.hip ? `Cadera: ${measurements.hip} cm` : "",
            measurements.heightCm ? `Estatura: ${measurements.heightCm} cm` : "",
            measurements.weightKg
              ? `Peso: ${weight} ${unit}`
              : "",
            `Talla sugerida: ${result.size}`,
          ]
            .filter(Boolean)
            .join("\n")
        )
      : whatsappLink(`Hola, necesito ayuda para elegir mi talla (${info.name}).`)

  return (
    <div className="surface-card p-5 small:p-8" data-testid="size-finder">
      <div className="grid gap-8 small:grid-cols-2 small:gap-12">
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-6"
          noValidate
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-heading text-sm uppercase tracking-[0.18em] text-brand-ghost-white">
              1. ¿Qué prenda buscas?
            </legend>
            <div className="flex flex-wrap gap-2">
              {LINE_ORDER.map((id) => (
                <FilterChip
                  key={id}
                  active={line === id}
                  onClick={() => setLine(id)}
                >
                  {LINE_LABEL[id]}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-heading text-sm uppercase tracking-[0.18em] text-brand-ghost-white">
              2. ¿Cómo la calculamos?
            </legend>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={tape}
                onClick={() => setMethod("tape")}
              >
                Tengo cinta métrica
              </FilterChip>
              <FilterChip
                active={!tape}
                onClick={() => setMethod("estimate")}
              >
                No tengo cinta
              </FilterChip>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-3 font-heading text-sm uppercase tracking-[0.18em] text-brand-ghost-white">
              3. Tus medidas
            </legend>

            {tape && line !== "jogger" && (
              <Field
                id="finder-chest"
                label="Pecho"
                unit="cm"
                hint="Por la parte más ancha del pecho, sin apretar la cinta."
                value={chest}
                error={errors.chest}
                onChange={setChest}
              />
            )}

            {tape && line === "jogger" && (
              <>
                <Field
                  id="finder-waist"
                  label="Cintura"
                  unit="cm"
                  hint="A la altura del ombligo, sin meter el abdomen."
                  value={waist}
                  error={errors.waist}
                  onChange={setWaist}
                />
                <Field
                  id="finder-hip"
                  label="Cadera"
                  unit="cm"
                  hint="Por la parte más ancha de cadera y glúteos."
                  value={hip}
                  error={errors.hip}
                  optional
                  onChange={setHip}
                />
              </>
            )}

            {!tape && (
              <>
                <Field
                  id="finder-height"
                  label="Estatura"
                  unit="cm"
                  hint="Puedes escribirla en metros: 1.75."
                  value={height}
                  error={errors.height}
                  onChange={setHeight}
                />
                <Field
                  id="finder-weight"
                  label="Peso"
                  unit={unit}
                  hint="Tu peso actual, sin zapatos."
                  value={weight}
                  error={errors.weight}
                  onChange={setWeight}
                />
                <div
                  role="group"
                  aria-label="Unidad del peso"
                  className="flex gap-2"
                >
                  {(["lb", "kg"] as const).map((option) => (
                    <FilterChip
                      key={option}
                      active={unit === option}
                      onClick={() => setUnit(option)}
                      className="min-w-[64px]"
                    >
                      {option === "lb" ? "Libras" : "Kilos"}
                    </FilterChip>
                  ))}
                </div>
              </>
            )}
          </fieldset>
        </form>

        <div
          aria-live="polite"
          className="flex flex-col gap-4 rounded-large border border-brand-amethyst/60 bg-brand-void-black/60 p-5 small:p-6"
          data-testid="size-finder-result"
        >
          {result.status === "ok" ? (
            <>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-silver-ash">
                Tu talla en {info.name.toLowerCase()}
              </p>
              <p
                className="font-heading text-6xl leading-none text-brand-ghost-white"
                style={{ textShadow: "0 0 24px rgba(192, 132, 252, 0.45)" }}
                data-testid="size-finder-size"
              >
                {result.size}
              </p>
              <p className="text-sm leading-relaxed text-brand-ghost-white/90">
                <strong className="font-semibold text-brand-ghost-white">
                  {info.rule}.
                </strong>{" "}
                {info.reason}
              </p>

              {result.alternatives.length > 0 && (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {result.alternatives.map((alt) => (
                    <li
                      key={alt.label}
                      className="flex items-baseline justify-between gap-4 border-b border-brand-amethyst/30 pb-1.5 last:border-b-0"
                    >
                      <span>{alt.label}</span>
                      <strong className="font-heading text-brand-ghost-white">
                        {alt.size}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}

              {result.notes.map((note) => (
                <p
                  key={note}
                  className="border-l-2 pl-3 text-xs leading-relaxed text-brand-silver-ash"
                  style={{ borderColor: "var(--brand-sacred-violet)" }}
                >
                  {note}
                </p>
              ))}

              {sizesInStock && (
                <p className="text-xs leading-relaxed text-brand-silver-ash">
                  {stock?.[result.size]
                    ? `Ahora hay ${stock[result.size]} ${
                        stock[result.size] === 1 ? "modelo" : "modelos"
                      } en talla ${result.size}.`
                    : `La talla ${result.size} está agotada por ahora.`}{" "}
                  {sizesInStock.length > 0 &&
                    `Tallas con stock en esta línea: ${sizesInStock.join(", ")}.`}
                </p>
              )}
            </>
          ) : result.status === "out-of-range" ? (
            <>
              <p className="font-heading text-lg uppercase tracking-[0.12em] text-brand-ghost-white">
                Estás fuera de nuestra tabla
              </p>
              <p className="text-sm leading-relaxed">
                Tu {result.what} queda fuera de las medidas de esta línea.
                Escríbenos y te ayudamos a encontrar la talla más cercana.
              </p>
            </>
          ) : (
            <>
              <p className="font-heading text-lg uppercase tracking-[0.12em] text-brand-ghost-white">
                Tu talla, al instante
              </p>
              <p className="text-sm leading-relaxed">
                {tape
                  ? line === "jogger"
                    ? "Escribe tu cintura (y tu cadera si la tienes) y te decimos qué talla pedir."
                    : "Escribe tu pecho en centímetros y te decimos qué talla pedir."
                  : "Escribe tu estatura y tu peso y te damos una estimación."}
              </p>
            </>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            {result.status === "ok" && (
              <a href={`#${info.anchor}`} className="btn-ghost text-center">
                Ver la tabla y los modelos
              </a>
            )}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-center"
            >
              {result.status === "ok"
                ? "Confirmar mi talla por WhatsApp"
                : "Pedir ayuda por WhatsApp"}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SizeFinder
