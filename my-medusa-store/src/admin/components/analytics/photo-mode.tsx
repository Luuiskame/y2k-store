import { Eye, EyeSlash, XMark } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import {
  LiveResponse,
  PRESETS,
  Preset,
  SalesResponse,
  TrafficResponse,
} from "../../lib/analytics"
import {
  changeOf,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRange,
} from "../../lib/analytics-format"
import { STORE_HANDLE } from "../../lib/orders-format"
import { FitText } from "../common/fit-text"
import { LivePill, Sparkline } from "./hero"

const CONTROLS_VISIBLE_MS = 4000

const stamp = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Tegucigalpa",
})

/** The same figure with its digits covered, for a capture that hides them. */
const mask = (text: string) => text.replace(/\d/g, "•")

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-w-0 flex-col items-center gap-1 text-center">
    <span className="y2k-num text-[clamp(1.25rem,6vw,2rem)] font-medium leading-none">
      {value}
    </span>
    <span className="txt-compact-xsmall text-ui-fg-subtle uppercase tracking-[0.14em]">
      {label}
    </span>
  </div>
)

/**
 * Estadísticas as a poster: the period's sales filling the screen in the
 * palette's colors, made to be photographed or screenshotted. Tap the screen
 * and the controls step aside; tap again and they are back.
 *
 * The amounts can be covered ("L •,•••.••") for a capture that shows the
 * panel without showing the money.
 */
export const PhotoMode = ({
  sales,
  traffic,
  live,
  preset,
  onPreset,
  onClose,
}: {
  sales: SalesResponse | undefined
  traffic: TrafficResponse | undefined
  live: LiveResponse | undefined
  preset: Preset
  onPreset: (preset: Preset) => void
  onClose: () => void
}) => {
  const [hidden, setHidden] = useState(false)
  const [controls, setControls] = useState(true)
  const close = useRef<HTMLButtonElement>(null)

  // The controls leave on their own, so the capture is clean without a tap.
  useEffect(() => {
    if (!controls) {
      return
    }
    const timer = setTimeout(() => setControls(false), CONTROLS_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [controls, preset, hidden])

  useEffect(() => {
    close.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const option = PRESETS.find((p) => p.value === preset) ?? PRESETS[0]
  const show = (text: string) => (hidden ? mask(text) : text)
  const money = (value: number, compact = false) =>
    sales ? show(formatMoney(value, sales.currency, { compact })) : "—"
  const change = sales ? changeOf(sales.totals.sales, sales.previous.sales) : null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modo foto"
      className="y2k-photo fixed inset-0 z-50 flex select-none flex-col overflow-hidden"
      onClick={() => setControls((visible) => !visible)}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="y2k-wordmark y2k-hero-number text-[clamp(2.2rem,10vw,3.4rem)]">
            Y2K Fit
          </span>
          <span className="txt-compact-xsmall-plus text-ui-fg-subtle uppercase tracking-[0.3em]">
            Honduras
          </span>
        </div>
        <LivePill active={live?.active} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
        <div className="flex w-full max-w-[900px] flex-col items-center gap-2">
          <span className="txt-compact-small-plus text-ui-fg-subtle uppercase tracking-[0.22em]">
            Ventas · {option.label}
          </span>
          <FitText max={128} min={34} className="y2k-num y2k-hero-number">
            {sales ? money(sales.totals.sales) : "…"}
          </FitText>
          <span className="txt-compact-small text-ui-fg-subtle">
            {change !== null && !hidden
              ? `${change >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(change))} ${option.comparison.replace(/^vs\. /, "contra ")}`
              : sales
              ? formatRange(sales.range.from, sales.range.to)
              : ""}
          </span>
        </div>

        <Sparkline
          values={sales?.series.current.sales ?? []}
          className="h-24 max-w-[720px] md:h-32"
          strokeWidth={2.5}
        />

        <div className="grid w-full max-w-[720px] grid-cols-3 gap-4">
          <Stat label="Pedidos" value={sales ? show(formatNumber(sales.totals.orders)) : "—"} />
          <Stat
            label="Ticket promedio"
            value={sales ? money(sales.totals.average_order, true) : "—"}
          />
          <Stat
            label="Visitas"
            value={traffic ? show(formatNumber(traffic.totals.sessions)) : "—"}
          />
        </div>
      </main>

      <footer className="flex items-end justify-between gap-4">
        <span className="txt-compact-small-plus text-ui-fg-subtle">{STORE_HANDLE}</span>
        <span className="txt-compact-xsmall text-ui-fg-muted">
          {stamp.format(new Date())} · hora de Honduras
        </span>
      </footer>

      <div
        className={clx(
          "y2k-photo-controls absolute inset-x-0 bottom-0 flex flex-col gap-3 transition-opacity duration-300",
          controls ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="y2k-chips" role="group" aria-label="Período">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="y2k-chip"
              aria-pressed={p.value === preset}
              onClick={() => onPreset(p.value)}
              tabIndex={controls ? 0 : -1}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="y2k-chip"
            aria-pressed={hidden}
            onClick={() => setHidden((value) => !value)}
            tabIndex={controls ? 0 : -1}
          >
            {hidden ? <EyeSlash /> : <Eye />}
            {hidden ? "Montos ocultos" : "Ocultar montos"}
          </button>
          <span className="txt-compact-xsmall text-ui-fg-subtle hidden text-center sm:block">
            Tocá la pantalla para esconder estos controles
          </span>
          <button
            ref={close}
            type="button"
            className="y2k-chip"
            onClick={onClose}
            tabIndex={controls ? 0 : -1}
          >
            <XMark />
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
