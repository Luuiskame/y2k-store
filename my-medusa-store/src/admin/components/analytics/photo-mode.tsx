import { Eye, EyeSlash, XMark } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { useT } from "../../i18n/use-t"
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
  formatStamp,
} from "../../lib/analytics-format"
import { CompactOrder, useCompactOrders } from "../../lib/compact"
import { storeDay } from "../../lib/larp"
import {
  STORE_HANDLE,
  STORE_NAME,
  formatAgo,
  paymentMethodName,
} from "../../lib/orders-format"
import { useThemePrefs } from "../../lib/theme-sync"
import { FitText } from "../common/fit-text"
import { Motto } from "../larp/motto"
import { SalesTicker, captionOf } from "../larp/pulse"
import { LivePill, Sparkline } from "./hero"

const CONTROLS_VISIBLE_MS = 4000

/** How many orders the pile shows at most; a shorter screen shows fewer. */
const STACK_SIZE = 5

/** One alert of the pile and the space between two, until one is on screen to measure. */
const NOTIFY_HEIGHT = 86
const NOTIFY_GAP = 8
/** The space between the figure and the pile, and the line under it ("+4 más"). */
const STACK_MARGIN = 20
const STACK_MORE = 40

/** The figure never takes more than this share of the height the middle has. */
const FIGURE_SHARE = 0.4
const FIGURE_SMALLEST = 22
/** Under this much height (a phone on its side) only the figure is shown. */
const TIGHT_BELOW = 260

type Fit = {
  /** The height the middle of the poster has for its content, in pixels. */
  space: number
  /** How many alerts fit whole under the figure. */
  room: number
  /** Whether the line under the pile ("+4 más") fits as well. */
  more: boolean
}

/** Until the screen is measured: a tall one. */
const ROOMY: Fit = { space: Infinity, room: STACK_SIZE, more: true }

const sameFit = (a: Fit, b: Fit) => a.space === b.space && a.room === b.room && a.more === b.more

type Scene = "board" | "stack"

/** The same figure with its digits covered, for a capture that hides them. */
const mask = (text: string) => text.replace(/\d/g, "•")
const asIs = (text: string) => text

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
 * One order as the alert it arrived as. What it never shows is who bought:
 * a screenshot of this gets posted, and the customer did not sign up for
 * that. Number, amount, city and how it is paid.
 */
const Notification = ({
  order,
  index,
  show,
}: {
  order: CompactOrder
  /** Position from the top; the pile builds up from the bottom. */
  index: number
  show: (text: string) => string
}) => {
  const t = useT()
  const number = order.display_id ? ` #${order.display_id}` : ""
  const details = [
    show(formatMoney(order.total, order.currency_code)),
    order.city,
    paymentMethodName(order.payment_provider),
  ].filter(Boolean)

  return (
    <li className="y2k-notify" style={{ "--y2k-i": index } as CSSProperties}>
      <span className="y2k-notify-icon y2k-wordmark" aria-hidden>
        Y
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="txt-compact-xsmall-plus text-ui-fg-subtle truncate uppercase tracking-[0.14em]">
            {STORE_NAME}
          </span>
          <span className="txt-compact-xsmall text-ui-fg-muted shrink-0">
            {formatAgo(order.created_at)}
          </span>
        </div>
        <span className="txt-compact-medium-plus text-ui-fg-base truncate">
          {show(`${t.analytics.photo.stackTitle}${number}`)}
        </span>
        <span className="txt-compact-small text-ui-fg-subtle truncate">
          {details.join(" · ")}
        </span>
      </div>
    </li>
  )
}

/**
 * Estadísticas as a poster: the period's sales filling the screen in the
 * palette's colors, made to be photographed or screenshotted. Tap the screen
 * and the controls step aside; tap again and they are back.
 *
 * Two scenes: the scoreboard (the figure, its curve and three numbers), and
 * the pile of order alerts, which is how a good day looks on a lock screen.
 * Whatever the screen, the middle never runs over the store's name above it
 * or the motto below: the pile holds only the alerts that fit, and the curve
 * of the scoreboard gives up its height before anything else does.
 * Both are the period's real orders. The figure always comes with its
 * period, its date and its currency, and the amounts can be covered
 * ("L •,•••.••") for a capture that shows the panel without the money.
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
  const t = useT()
  const { hype } = useThemePrefs()
  const [scene, setScene] = useState<Scene>("board")
  const [hidden, setHidden] = useState(false)
  const [controls, setControls] = useState(true)
  const close = useRef<HTMLButtonElement>(null)
  // The middle of the poster and, in it, the block of the figure: what is
  // left under the figure is the room the pile has. (A plain <div>, not a
  // second <main>: the page has its own, and the room theme.css leaves under
  // every <main> for the bottom bar would be taken from the poster too.)
  const middle = useRef<HTMLDivElement>(null)
  const headline = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<Fit>(ROOMY)

  // The newest orders; the same request the phone's order list makes.
  const recent = useCompactOrders({ view: "all", q: "", enabled: scene === "stack" })

  // The controls leave on their own, so the capture is clean without a tap.
  useEffect(() => {
    if (!controls) {
      return
    }
    const timer = setTimeout(() => setControls(false), CONTROLS_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [controls, preset, hidden, scene])

  /*
   * What the middle of the poster holds follows the height it really has.
   * The pile shows as many alerts as fit whole under the figure, and no
   * more: a full pile is taller than a phone has room for, and left to
   * itself it pushes the figure up over the name of the store and the line
   * under it down over the motto. Measured rather than guessed from the
   * screen height, because what the figure, the caption and the motto take
   * changes with the type set, the period and the words.
   */
  useLayoutEffect(() => {
    const box = middle.current
    const top = headline.current
    if (!box || !top) {
      return
    }

    const measure = () => {
      const card = box.querySelector<HTMLElement>(".y2k-notify")?.offsetHeight || NOTIFY_HEIGHT
      const style = getComputedStyle(box)
      const space =
        box.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      const under = space - top.offsetHeight - STACK_MARGIN
      const cards = (height: number) =>
        Math.max(0, Math.min(STACK_SIZE, Math.floor((height + NOTIFY_GAP) / (card + NOTIFY_GAP))))
      // With the line under the pile if it fits; a single alert without it
      // rather than none.
      const withMore = cards(under - STACK_MORE)
      const next: Fit =
        withMore > 0
          ? { space, room: withMore, more: true }
          : { space, room: Math.min(1, cards(under)), more: false }
      setFit((current) => (sameFit(current, next) ? current : next))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(top)
    return () => observer.disconnect()
  }, [scene])

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

  const words = t.analytics.presets[preset]
  const show = hidden ? mask : asIs
  const money = (value: number, compact = false) =>
    sales ? show(formatMoney(value, sales.currency, { compact })) : "—"
  const change = sales ? changeOf(sales.totals.sales, sales.previous.sales) : null
  // A phone on its side: the figure alone, at a size that fits.
  const tight = fit.space < TIGHT_BELOW
  const sized = (max: number) =>
    Math.max(FIGURE_SMALLEST, Math.min(max, Math.floor(fit.space * FIGURE_SHARE)))
  const caption = hype && !hidden && !tight ? captionOf(t, sales, preset) : null

  // The pile only holds sales of the period on screen, newest first.
  const pile = sales
    ? (recent.data?.pages[0]?.orders ?? []).filter((order) => {
        const day = storeDay(new Date(order.created_at).getTime())
        return order.status !== "canceled" && day >= sales.range.from && day <= sales.range.to
      })
    : []
  const piled = pile.slice(0, fit.room)
  const beyond = sales ? Math.max(0, sales.totals.orders - piled.length) : 0

  const figure = (max: number) => (
    <div ref={headline} className="flex w-full max-w-[900px] flex-none flex-col items-center gap-2">
      <span className="txt-compact-small-plus text-ui-fg-subtle uppercase tracking-[0.22em]">
        {t.analytics.hero.salesOf(words.label)}
      </span>
      <FitText max={sized(max)} min={Math.min(34, sized(max))} className="y2k-num y2k-hero-number">
        {sales ? money(sales.totals.sales) : "…"}
      </FitText>
      <span className="txt-compact-small text-ui-fg-subtle">
        {change !== null && !hidden
          ? `${change >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(change))} ${t.analytics.against(words.ref)}`
          : sales
          ? formatRange(sales.range.from, sales.range.to)
          : ""}
      </span>
      {caption && <p className="y2k-display y2k-caption">{caption}</p>}
    </div>
  )

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.analytics.photo.aria}
      className="y2k-photo fixed inset-0 z-50 flex select-none flex-col overflow-hidden"
      onClick={() => setControls((visible) => !visible)}
    >
      <header className="flex flex-none items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="y2k-wordmark y2k-brand text-[clamp(2.2rem,10vw,3.4rem)]">
            {STORE_NAME}
          </span>
          <span className="txt-compact-xsmall-plus text-ui-fg-subtle uppercase tracking-[0.3em]">
            Honduras
          </span>
        </div>
        <LivePill active={live?.active} />
      </header>

      {scene === "board" ? (
        <div ref={middle} className="y2k-photo-main gap-6">
          {figure(128)}

          {!tight && (
            <Sparkline
              values={sales?.series.current.sales ?? []}
              className="y2k-photo-spark max-w-[720px]"
              strokeWidth={2.5}
            />
          )}

          {!tight && (
            <div className="grid w-full max-w-[720px] flex-none grid-cols-3 gap-4">
              <Stat
                label={t.analytics.hero.orders}
                value={sales ? show(formatNumber(sales.totals.orders)) : "—"}
              />
              <Stat
                label={t.analytics.hero.averageOrder}
                value={sales ? money(sales.totals.average_order, true) : "—"}
              />
              <Stat
                label={t.analytics.photo.visits}
                value={traffic ? show(formatNumber(traffic.totals.sessions)) : "—"}
              />
            </div>
          )}
        </div>
      ) : (
        <div ref={middle} className="y2k-photo-main gap-5">
          {figure(84)}

          {piled.length > 0 ? (
            <ul
              className="y2k-stack flex w-full max-w-[520px] flex-none flex-col gap-2 text-left"
              aria-label={t.analytics.photo.stackAria}
              style={{ "--y2k-n": piled.length } as CSSProperties}
              // A new period or a new order replays the pile building up.
              key={`${preset}:${piled[0].id}`}
            >
              {piled.map((order, index) => (
                <Notification key={order.id} order={order} index={index} show={show} />
              ))}
            </ul>
          ) : fit.room === 0 ? null : (
            <p className="txt-compact-small text-ui-fg-subtle max-w-[420px] flex-none">
              {/* "No orders" is only said once the orders are in hand: a
                  request that failed or has not answered must not read as an
                  empty day. */}
              {recent.isError
                ? t.analytics.loadError
                : !recent.data || !sales
                ? "…"
                : t.analytics.photo.stackEmpty}
            </p>
          )}
          {beyond > 0 && piled.length > 0 && fit.more && (
            <span className="txt-compact-small-plus text-ui-fg-subtle flex-none">
              {show(t.analytics.photo.stackMore(formatNumber(beyond)))}
            </span>
          )}
        </div>
      )}

      <footer className="flex flex-none flex-col gap-3">
        <Motto size="md" className="text-center" />
        <div className="flex items-end justify-between gap-4">
          <span className="txt-compact-small-plus text-ui-fg-subtle">{STORE_HANDLE}</span>
          <span className="txt-compact-xsmall text-ui-fg-muted text-right">
            {formatStamp(new Date())} · {t.analytics.storeTime}
          </span>
        </div>
        {hype && (
          <SalesTicker
            sales={sales}
            live={live}
            preset={preset}
            mask={show}
            className="y2k-ticker-bleed"
          />
        )}
      </footer>

      <div
        className={clx(
          "y2k-photo-controls absolute inset-x-0 bottom-0 flex flex-col gap-3 transition-opacity duration-300",
          controls ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="y2k-chips" role="group" aria-label={t.analytics.photo.sceneAria}>
          {(["board", "stack"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className="y2k-chip"
              aria-pressed={option === scene}
              onClick={() => setScene(option)}
              tabIndex={controls ? 0 : -1}
            >
              {option === "board" ? t.analytics.photo.sceneBoard : t.analytics.photo.sceneStack}
            </button>
          ))}
        </div>
        <div className="y2k-chips" role="group" aria-label={t.analytics.period}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              className="y2k-chip"
              aria-pressed={p.value === preset}
              onClick={() => onPreset(p.value)}
              tabIndex={controls ? 0 : -1}
            >
              {t.analytics.presets[p.value].label}
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
            {hidden ? t.analytics.photo.amountsHidden : t.analytics.photo.hideAmounts}
          </button>
          <span className="txt-compact-xsmall text-ui-fg-subtle hidden text-center sm:block">
            {t.analytics.photo.tapHint}
          </span>
          <button
            ref={close}
            type="button"
            className="y2k-chip"
            onClick={onClose}
            tabIndex={controls ? 0 : -1}
          >
            <XMark />
            {t.analytics.photo.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
