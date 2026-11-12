import { BoltSolid } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useMemo } from "react"

import type { Dict } from "../../i18n/dictionary"
import { useT } from "../../i18n/use-t"
import type { LiveResponse, Momentum, Preset, SalesResponse } from "../../lib/analytics"
import { changeOf, formatMoney, formatNumber } from "../../lib/analytics-format"
import { moodOf, pickLine, storeDay, tickerItems, winterArcDay } from "../../lib/larp"
import { useThemePrefs } from "../../lib/theme-sync"
import { Ticker } from "./ticker"

/**
 * The "larp mode" readings of the period: a line under the figure, the pills
 * of the streak and the ticker. All three are read off the real report; with
 * no report yet there is nothing to say and they render nothing.
 */

const identity = (text: string) => text

/** A streak of one day is just a day. */
const STREAK_WORTH_SHOWING = 2

/** The line that goes with how the period is going; the same one all day. */
export const captionOf = (
  t: Dict,
  sales: SalesResponse | undefined,
  preset: Preset
): string | null => {
  if (!sales) {
    return null
  }
  const mood = moodOf({
    orders: sales.totals.orders,
    change: changeOf(sales.totals.sales, sales.previous.sales),
    today: preset === "today",
  })
  return pickLine(t.larp.captions[mood], `${storeDay()}:${preset}:${mood}`)
}

type Pill = { key: string; text: string; title: string; lit: boolean }

const pillsOf = (t: Dict, momentum: Momentum | undefined): Pill[] => {
  const pills: Pill[] = []
  if (momentum && momentum.streak >= STREAK_WORTH_SHOWING) {
    pills.push({
      key: "streak",
      text: t.larp.streak(momentum.streak),
      title: momentum.includes_today
        ? `${t.larp.streakHelp} ${t.larp.best(momentum.best)}.`
        : t.larp.streakPending,
      lit: momentum.includes_today,
    })
  }
  if (momentum?.day_number) {
    pills.push({
      key: "day",
      text: t.larp.dayNumber(formatNumber(momentum.day_number)),
      title: t.larp.dayNumberHelp,
      lit: false,
    })
  }
  const arc = winterArcDay(storeDay())
  if (arc) {
    pills.push({
      key: "arc",
      text: t.larp.winterArc(arc.day, arc.of),
      title: t.larp.activeDays(momentum?.active_days_30 ?? 0),
      lit: false,
    })
  }
  return pills
}

/** The streak, "day N" and, in season, the day of the winter arc. */
export const MomentumPills = ({
  momentum,
  className,
}: {
  momentum: Momentum | undefined
  className?: string
}) => {
  const t = useT()
  const pills = pillsOf(t, momentum)
  if (pills.length === 0) {
    return null
  }

  return (
    <ul className={clx("flex flex-wrap items-center gap-1.5", className)}>
      {pills.map((pill) => (
        <li key={pill.key} className="y2k-pill" data-lit={pill.lit || undefined} title={pill.title}>
          {pill.key === "streak" && <BoltSolid aria-hidden />}
          {pill.text}
        </li>
      ))}
    </ul>
  )
}

/**
 * The band under the figure: the motto, then the period's real figures and
 * the phrases by turns. The phrases are the owner's own once they write
 * some (Ajustes → Apariencia); until then, the originals in the panel's
 * language. `mask` covers the digits when amounts are hidden in Modo foto.
 */
export const SalesTicker = ({
  sales,
  live,
  preset,
  mask = identity,
  className,
}: {
  sales: SalesResponse | undefined
  live: LiveResponse | undefined
  preset: Preset
  mask?: (text: string) => string
  className?: string
}) => {
  const t = useT()
  const { motto, phrases } = useThemePrefs()

  const items = useMemo(() => {
    const period = t.analytics.presets[preset].label
    const facts: string[] = []
    if (sales) {
      facts.push(
        mask(t.larp.facts.sales(formatMoney(sales.totals.sales, sales.currency), period)),
        mask(
          t.larp.facts.orders(
            sales.totals.orders,
            formatNumber(sales.totals.orders),
            period
          )
        )
      )
      if (sales.momentum && sales.momentum.streak >= STREAK_WORTH_SHOWING) {
        facts.push(t.larp.streak(sales.momentum.streak))
      }
      if (sales.totals.orders > 0) {
        facts.push(
          mask(
            t.larp.facts.averageOrder(
              formatMoney(sales.totals.average_order, sales.currency, { compact: true })
            )
          )
        )
      }
      if (sales.momentum?.day_number) {
        facts.push(t.larp.dayNumber(formatNumber(sales.momentum.day_number)))
      }
    }
    if (live && live.active > 0) {
      facts.push(t.larp.facts.people(live.active, formatNumber(live.active)))
    }
    const arc = winterArcDay(storeDay())
    if (arc) {
      facts.push(t.larp.winterArc(arc.day, arc.of))
    }

    return tickerItems({ motto, facts, phrases: phrases ?? t.larp.mantras })
  }, [t, motto, phrases, sales, live, preset, mask])

  return <Ticker items={items} className={className} />
}
