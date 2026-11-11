import { Camera } from "@medusajs/icons"
import { Button, Text, clx } from "@medusajs/ui"
import { useId } from "react"

import type { LiveResponse, SalesResponse } from "../../lib/analytics"
import { changeOf, formatMoney, formatNumber } from "../../lib/analytics-format"
import { FitText } from "../common/fit-text"
import { Change } from "./stat-tile"

type Query<T> = { data?: T; isLoading: boolean; isPlaceholderData: boolean }

/**
 * The shape of a period in one stroke: the current series as a line over a
 * wash of the accent, no axes. Buckets that have not happened yet (nulls)
 * are simply not drawn. Decorative: the chart further down has the numbers.
 */
export const Sparkline = ({
  values,
  className,
  strokeWidth = 2,
}: {
  values: (number | null)[]
  className?: string
  strokeWidth?: number
}) => {
  const gradient = useId()
  const known = values
    .map((value, index) => ({ value, index }))
    .filter((point): point is { value: number; index: number } => point.value !== null)

  if (known.length < 2) {
    return <div className={className} aria-hidden />
  }

  const width = 100
  const height = 32
  const pad = 3
  const max = Math.max(...known.map((point) => point.value), 0)
  const span = Math.max(1, values.length - 1)
  const x = (index: number) => (index / span) * width
  // A flat zero period sits on the baseline instead of dividing by zero.
  const y = (value: number) =>
    max > 0 ? height - pad - (value / max) * (height - pad * 2) : height - pad

  const line = known
    .map((point, i) => `${i ? "L" : "M"}${x(point.index).toFixed(2)},${y(point.value).toFixed(2)}`)
    .join("")
  const first = known[0]
  const last = known[known.length - 1]
  const area = `${line}L${x(last.index).toFixed(2)},${height}L${x(first.index).toFixed(2)},${height}Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={clx("block w-full overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--y2k-accent)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--y2k-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradient})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--y2k-accent)"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** People on the storefront right now, with the pulse of the live panel. */
export const LivePill = ({ active }: { active: number | undefined }) => (
  <span className="bg-ui-bg-base shadow-borders-base inline-flex items-center gap-2 rounded-full px-3 py-1.5">
    <span className="relative flex h-2 w-2" aria-hidden>
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping"
        style={{ backgroundColor: "var(--an-live, #22c55e)" }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: "var(--an-live, #22c55e)" }}
      />
    </span>
    <span className="txt-compact-xsmall-plus text-ui-fg-base tabular-nums">
      {active === undefined
        ? "En vivo"
        : `${formatNumber(active)} ${active === 1 ? "persona ahora" : "personas ahora"}`}
    </span>
  </span>
)

const Mini = ({
  label,
  value,
  change,
  hint,
}: {
  label: string
  value: string | null
  change?: number | null
  hint?: string | null
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <dt className="txt-compact-xsmall text-ui-fg-subtle truncate">{label}</dt>
    <dd className="y2k-num text-ui-fg-base truncate text-[19px] font-medium leading-6">
      {value ?? "—"}
    </dd>
    <div className="flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-1">
      {change !== null && change !== undefined && <Change value={change} />}
      {hint && (
        <span className="txt-compact-xsmall text-ui-fg-muted">{hint}</span>
      )}
    </div>
  </div>
)

/**
 * The top of Estadísticas: what was sold in the period, as big as the screen
 * allows, with the three figures that explain it and the period's shape
 * under them. The rest of the page is the detail.
 */
export const SalesHero = ({
  sales,
  live,
  periodLabel,
  comparison,
  onPhoto,
}: {
  sales: Query<SalesResponse>
  live: { data?: LiveResponse }
  /** "Hoy", "Últimos 7 días"… */
  periodLabel: string
  /** "vs. ayer a esta hora"… */
  comparison: string
  onPhoto: () => void
}) => {
  const s = sales.data

  return (
    <section
      className={clx(
        "y2k-hero flex flex-col gap-5 px-5 py-5 transition-opacity md:px-6 md:py-6",
        sales.isPlaceholderData && "opacity-60"
      )}
      aria-label={`Ventas: ${periodLabel}`}
    >
      {/* On a phone the pills go above, so the figure gets the full width. */}
      <div className="flex flex-col-reverse gap-4 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="txt-compact-xsmall-plus text-ui-fg-subtle uppercase tracking-[0.16em]">
            Ventas · {periodLabel}
          </span>
          <FitText max={68} min={28} className="y2k-num y2k-hero-number">
            {s ? formatMoney(s.totals.sales, s.currency) : sales.isLoading ? "…" : "—"}
          </FitText>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {s && changeOf(s.totals.sales, s.previous.sales) !== null && (
              <Change value={changeOf(s.totals.sales, s.previous.sales)!} />
            )}
            <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
              {comparison}
            </Text>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 md:flex-col md:items-end md:justify-start">
          <LivePill active={live.data?.active} />
          <Button size="small" variant="secondary" onClick={onPhoto}>
            <Camera />
            Modo foto
          </Button>
        </div>
      </div>

      <Sparkline values={s?.series.current.sales ?? []} className="h-14 md:h-16" />

      <dl className="grid grid-cols-3 gap-4">
        <Mini
          label="Pedidos"
          value={s ? formatNumber(s.totals.orders) : null}
          change={s ? changeOf(s.totals.orders, s.previous.orders) : null}
          hint={s ? `${formatNumber(s.totals.units)} u.` : null}
        />
        <Mini
          label="Ticket promedio"
          value={s ? formatMoney(s.totals.average_order, s.currency, { compact: true }) : null}
          change={s ? changeOf(s.totals.average_order, s.previous.average_order) : null}
        />
        <Mini
          label="Cobrado"
          value={s ? formatMoney(s.totals.collected, s.currency, { compact: true }) : null}
          change={s ? changeOf(s.totals.collected, s.previous.collected) : null}
          hint={
            s && s.totals.outstanding > 0
              ? `${formatMoney(s.totals.outstanding, s.currency, { compact: true })} por cobrar`
              : null
          }
        />
      </dl>
    </section>
  )
}
