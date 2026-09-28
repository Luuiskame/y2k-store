import { Table, Text } from "@medusajs/ui"
import {
  KeyboardEvent,
  PointerEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import type { Granularity } from "../../lib/analytics"
import { formatBucket } from "../../lib/analytics-format"

export type TrendSeries = { buckets: string[]; values: (number | null)[] }

type TrendProps = {
  granularity: Granularity
  current: TrendSeries
  previous: TrendSeries
  /** The single day an hourly series belongs to, for the tooltip header. */
  currentDay?: string
  previousDay?: string
  format: (value: number) => string
  formatTick: (value: number) => string
  /** Counts: ticks land on whole numbers. */
  integer?: boolean
  /** Accessible name of the chart, e.g. "Ventas por día". */
  label: string
}

const PLOT_HEIGHT = 220
const AXIS_BAND = 28
const PAD = { top: 12, right: 12, left: 64 }
const TOOLTIP_WIDTH = 200

/** Axis from zero to a round number, with about four steps. */
const niceScale = (max: number, integer: boolean) => {
  const safeMax = max > 0 ? max : integer ? 4 : 1
  const raw = safeMax / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  let step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ??
    10 * magnitude
  if (integer) {
    step = Math.max(1, Math.ceil(step))
  }
  const top = Math.ceil(safeMax / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= top + step / 2; value += step) {
    ticks.push(value)
  }
  return { top, ticks }
}

/** A path through the non-empty points; an empty bucket lifts the pen. */
const linePath = (
  values: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number
) => {
  let d = ""
  let drawing = false
  values.forEach((value, i) => {
    if (value === null) {
      drawing = false
      return
    }
    d += `${drawing ? "L" : "M"}${x(i).toFixed(1)},${y(value).toFixed(1)}`
    drawing = true
  })
  return d
}

const areaPath = (
  values: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number,
  baseline: number
) => {
  const runs: number[][] = []
  let run: number[] = []
  values.forEach((value, i) => {
    if (value === null) {
      if (run.length) {
        runs.push(run)
      }
      run = []
    } else {
      run.push(i)
    }
  })
  if (run.length) {
    runs.push(run)
  }

  return runs
    .filter((r) => r.length > 1)
    .map(
      (r) =>
        `M${x(r[0]).toFixed(1)},${baseline}` +
        r.map((i) => `L${x(i).toFixed(1)},${y(values[i]!).toFixed(1)}`).join("") +
        `L${x(r[r.length - 1]).toFixed(1)},${baseline}Z`
    )
    .join("")
}

const lastIndexWithValue = (values: (number | null)[]) => {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null) {
      return i
    }
  }
  return -1
}

/** A short stroke in the series color: identifies a series in text rows. */
const LineKey = ({ color }: { color: string }) => (
  <span
    aria-hidden
    className="inline-block h-0.5 w-3 shrink-0 rounded-full"
    style={{ backgroundColor: color }}
  />
)

export const TrendLegend = () => (
  <div className="flex items-center gap-x-4">
    <div className="flex items-center gap-x-1.5">
      <LineKey color="var(--an-series)" />
      <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
        Este período
      </Text>
    </div>
    <div className="flex items-center gap-x-1.5">
      <LineKey color="var(--an-context)" />
      <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
        Período anterior
      </Text>
    </div>
  </div>
)

/**
 * Current period against the previous one on a single axis: the current line
 * in the accent color over a light wash, the previous one in gray. A vertical
 * crosshair snaps to the nearest bucket and one tooltip lists both values;
 * the arrow keys do the same once the chart has focus.
 */
export const TrendChart = ({
  granularity,
  current,
  previous,
  currentDay,
  previousDay,
  format,
  formatTick,
  integer = false,
  label,
}: TrendProps) => {
  const wrapper = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)

  useLayoutEffect(() => {
    const element = wrapper.current
    if (!element) {
      return
    }
    setWidth(element.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const count = Math.max(current.values.length, previous.values.length)
  const plotWidth = Math.max(0, width - PAD.left - PAD.right)
  const baseline = PAD.top + PLOT_HEIGHT

  const { top, ticks } = useMemo(() => {
    const values = [...current.values, ...previous.values].filter(
      (v): v is number => v !== null
    )
    return niceScale(Math.max(0, ...values), integer)
  }, [current.values, previous.values, integer])

  const stepX = count > 1 ? plotWidth / (count - 1) : 0
  const x = (i: number) =>
    PAD.left + (count > 1 ? i * stepX : plotWidth / 2)
  const y = (v: number) => PAD.top + PLOT_HEIGHT - (v / top) * PLOT_HEIGHT

  const xLabels = useMemo(() => {
    const room = Math.max(2, Math.floor(plotWidth / 72))
    const every = Math.max(1, Math.ceil(count / room))
    const indices: number[] = []
    for (let i = 0; i < count; i += every) {
      indices.push(i)
    }
    return indices
  }, [count, plotWidth])

  const lastCurrent = lastIndexWithValue(current.values)

  const pick = (clientX: number) => {
    const box = wrapper.current?.getBoundingClientRect()
    if (!box || count === 0) {
      return
    }
    const offset = clientX - box.left - PAD.left
    const index = count > 1 ? Math.round(offset / stepX) : 0
    setActive(Math.min(count - 1, Math.max(0, index)))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = active ?? Math.max(0, lastCurrent)
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, from - 1),
      ArrowRight: Math.min(count - 1, from + 1),
      Home: 0,
      End: count - 1,
    }
    if (event.key in moves) {
      event.preventDefault()
      setActive(moves[event.key])
    } else if (event.key === "Escape") {
      setActive(null)
    }
  }

  const bucketName = (series: TrendSeries, i: number, day?: string) =>
    series.buckets[i] !== undefined
      ? formatBucket(series.buckets[i], granularity, { day, long: true })
      : "—"

  const valueAt = (series: TrendSeries, i: number) => {
    const value = series.values[i]
    return value === null || value === undefined ? "—" : format(value)
  }

  const tooltipLeft =
    active === null
      ? 0
      : x(active) + 12 + TOOLTIP_WIDTH > width
      ? x(active) - 12 - TOOLTIP_WIDTH
      : x(active) + 12

  return (
    <div className="flex flex-col gap-y-3">
      <TrendLegend />
      <div
        ref={wrapper}
        className="relative w-full rounded-md outline-none focus-visible:shadow-borders-interactive-with-focus"
        style={{ height: PLOT_HEIGHT + PAD.top + AXIS_BAND }}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Usá las flechas para recorrer los valores.`}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((a) => a ?? Math.max(0, lastCurrent))}
        onBlur={() => setActive(null)}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => pick(event.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={PLOT_HEIGHT + PAD.top + AXIS_BAND}
            className="block overflow-visible"
            aria-hidden
          >
            <g className="text-ui-fg-muted" style={{ fontSize: 11 }}>
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={PAD.left + plotWidth}
                    y1={y(tick)}
                    y2={y(tick)}
                    style={{
                      stroke: tick === 0 ? "var(--border-strong)" : "var(--border-base)",
                      strokeWidth: 1,
                    }}
                    shapeRendering="crispEdges"
                  />
                  <text
                    x={PAD.left - 8}
                    y={y(tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="currentColor"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatTick(tick)}
                  </text>
                </g>
              ))}
              {xLabels.map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y={baseline + 18}
                  textAnchor={
                    count > 1 && i === 0 ? "start" : i === count - 1 ? "end" : "middle"
                  }
                  fill="currentColor"
                >
                  {current.buckets[i] !== undefined
                    ? formatBucket(current.buckets[i], granularity)
                    : ""}
                </text>
              ))}
            </g>

            <path
              d={linePath(previous.values, x, y)}
              style={{
                fill: "none",
                stroke: "var(--an-context)",
                strokeWidth: 2,
                strokeLinejoin: "round",
                strokeLinecap: "round",
              }}
            />
            <path
              d={areaPath(current.values, x, y, baseline)}
              style={{ fill: "var(--an-series)", fillOpacity: 0.1 }}
            />
            <path
              d={linePath(current.values, x, y)}
              style={{
                fill: "none",
                stroke: "var(--an-series)",
                strokeWidth: 2,
                strokeLinejoin: "round",
                strokeLinecap: "round",
              }}
            />

            {active === null && lastCurrent >= 0 && (
              <circle
                cx={x(lastCurrent)}
                cy={y(current.values[lastCurrent]!)}
                r={4}
                style={{ fill: "var(--an-series)", stroke: "var(--bg-base)", strokeWidth: 2 }}
              />
            )}

            {active !== null && (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={baseline}
                  style={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
                  shapeRendering="crispEdges"
                />
                {[
                  { series: previous, color: "var(--an-context)" },
                  { series: current, color: "var(--an-series)" },
                ].map(({ series, color }) => {
                  const value = series.values[active]
                  return value === null || value === undefined ? null : (
                    <circle
                      key={color}
                      cx={x(active)}
                      cy={y(value)}
                      r={4}
                      style={{ fill: color, stroke: "var(--bg-base)", strokeWidth: 2 }}
                    />
                  )
                })}
              </g>
            )}
          </svg>
        )}

        {active !== null && width > 0 && (
          <div
            aria-live="polite"
            className="bg-ui-bg-base shadow-elevation-flyout pointer-events-none absolute flex flex-col gap-y-2 rounded-lg px-3 py-2"
            style={{ left: tooltipLeft, top: PAD.top, width: TOOLTIP_WIDTH }}
          >
            <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
              {bucketName(current, active, currentDay)}
            </Text>
            <div className="flex items-center gap-x-2">
              <LineKey color="var(--an-series)" />
              <Text size="small" leading="compact" weight="plus">
                {valueAt(current, active)}
              </Text>
              <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
                este período
              </Text>
            </div>
            <div className="flex items-center gap-x-2">
              <LineKey color="var(--an-context)" />
              <Text size="small" leading="compact" weight="plus">
                {valueAt(previous, active)}
              </Text>
              <Text
                size="xsmall"
                leading="compact"
                className="truncate text-ui-fg-muted"
              >
                {bucketName(previous, active, previousDay)}
              </Text>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** The same numbers as the chart, as a table: nothing is hover-only. */
export const TrendTable = ({
  granularity,
  current,
  previous,
  currentDay,
  previousDay,
  format,
}: Omit<TrendProps, "formatTick" | "integer" | "label">) => {
  const rows = Math.max(current.buckets.length, previous.buckets.length)

  return (
    <div className="max-h-[300px] overflow-y-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{granularity === "hour" ? "Hora" : "Fecha"}</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Este período</Table.HeaderCell>
            <Table.HeaderCell>Período anterior</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Valor anterior</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Array.from({ length: rows }, (_, i) => (
            <Table.Row key={i}>
              <Table.Cell>
                {current.buckets[i] !== undefined
                  ? formatBucket(current.buckets[i], granularity, {
                      day: currentDay,
                      long: true,
                    })
                  : "—"}
              </Table.Cell>
              <Table.Cell className="text-right tabular-nums">
                {current.values[i] === null || current.values[i] === undefined
                  ? "—"
                  : format(current.values[i]!)}
              </Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">
                {previous.buckets[i] !== undefined
                  ? formatBucket(previous.buckets[i], granularity, {
                      day: previousDay,
                      long: true,
                    })
                  : "—"}
              </Table.Cell>
              <Table.Cell className="text-right tabular-nums text-ui-fg-subtle">
                {previous.values[i] === null || previous.values[i] === undefined
                  ? "—"
                  : format(previous.values[i]!)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}
