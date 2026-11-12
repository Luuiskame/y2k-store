import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath, ChartBar } from "@medusajs/icons"
import { Container, Heading, IconButton, Select, Text, Tooltip } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { SalesHero } from "../../components/analytics/hero"
import { LivePanel } from "../../components/analytics/live-panel"
import { PhotoMode } from "../../components/analytics/photo-mode"
import {
  Audience,
  Behavior,
  BestSellers,
  LandingPages,
  MostViewed,
  Notes,
  PaymentMethods,
  PendingWork,
  Provinces,
  Sources,
  Summary,
  Trend,
  WhatsappPages,
} from "../../components/analytics/sections"
import { Motto } from "../../components/larp/motto"
import { useT } from "../../i18n/use-t"
import { PRESETS, Preset, useLive, useSales, useTraffic } from "../../lib/analytics"
import { formatRange } from "../../lib/analytics-format"
import { STORE_HANDLE } from "../../lib/orders-format"
import { useAccountTheme, useThemePrefs } from "../../lib/theme-sync"
import { useIsPhone } from "../../lib/use-media"

/** The chosen period is remembered per browser; losing it costs nothing. */
const PRESET_KEY = "y2k-analytics-preset"

/**
 * Chart colors. The series takes the palette's accent (every palette's
 * accent is checked for 4.5:1 against its cards, well over the 3:1 a chart
 * mark needs; see theme/__tests__), with Medusa's blue as the value when no
 * palette is on. The grays for the comparison line are one step off the
 * surfaces in each mode. Green stays green: it means "live", not "brand".
 */
const CHART_COLORS = `
.y2k-analytics {
  --an-series: var(--y2k-accent, #3b82f6);
  --an-context: #8e8e96;
  --an-track: var(--y2k-wash, rgba(59, 130, 246, 0.14));
  --an-live: #0ca30c;
}
.dark .y2k-analytics {
  --an-context: #71717a;
  --an-live: #22c55e;
}
`

const readPreset = (): Preset => {
  try {
    const stored = localStorage.getItem(PRESET_KEY)
    if (PRESETS.some((option) => option.value === stored)) {
      return stored as Preset
    }
  } catch {
    // Storage blocked: start from today.
  }
  return "today"
}

const AnalyticsPage = () => {
  const t = useT()
  const { hype } = useThemePrefs()
  const [preset, setPreset] = useState<Preset>(readPreset)
  const [photo, setPhoto] = useState(false)
  const queryClient = useQueryClient()
  const phone = useIsPhone()
  useAccountTheme()

  const sales = useSales(preset)
  const traffic = useTraffic(preset)
  // Same query the live panel runs, shared through the cache: one request.
  const live = useLive()

  useEffect(() => {
    try {
      localStorage.setItem(PRESET_KEY, preset)
    } catch {
      // Storage blocked: the choice just isn't remembered.
    }
  }, [preset])

  const words = t.analytics.presets[preset]
  const range = sales.data?.range ?? traffic.data?.range
  const refreshing = sales.isFetching || traffic.isFetching

  const refresh = (
    <Tooltip content={t.analytics.refresh}>
      <IconButton
        size="small"
        aria-label={t.analytics.refresh}
        onClick={() => queryClient.invalidateQueries({ queryKey: ["y2k-analytics"] })}
      >
        <ArrowPath className={refreshing ? "animate-spin" : undefined} />
      </IconButton>
    </Tooltip>
  )

  return (
    <div className="y2k-analytics flex flex-col gap-y-3" data-y2k-ready>
      <style>{CHART_COLORS}</style>

      {phone ? (
        // On a phone the period is a row of pills under the title: one tap,
        // no menu to open.
        <div className="flex flex-col gap-3 px-1 pt-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Heading>{t.analytics.title}</Heading>
              <Text size="xsmall" leading="compact" className="text-ui-fg-subtle truncate">
                {range ? formatRange(range.from, range.to) : t.analytics.subtitleShort} ·{" "}
                {t.analytics.storeTime}
              </Text>
            </div>
            {refresh}
          </div>
          <div className="y2k-chips" role="group" aria-label={t.analytics.period}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className="y2k-chip"
                aria-pressed={p.value === preset}
                onClick={() => setPreset(p.value)}
              >
                {t.analytics.presets[p.value].label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Container className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Heading>{t.analytics.title}</Heading>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {range ? formatRange(range.from, range.to) : t.analytics.subtitleLong} ·{" "}
              {t.analytics.storeTime}
            </Text>
          </div>
          <div className="flex items-center gap-x-2">
            <Select
              size="small"
              value={preset}
              onValueChange={(value) => setPreset(value as Preset)}
            >
              <Select.Trigger className="w-[190px]" aria-label={t.analytics.period}>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {PRESETS.map((p) => (
                  <Select.Item key={p.value} value={p.value}>
                    {t.analytics.presets[p.value].label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            {refresh}
          </div>
        </Container>
      )}

      <SalesHero sales={sales} live={live} preset={preset} onPhoto={() => setPhoto(true)} />
      <PendingWork sales={sales} />
      <Summary sales={sales} traffic={traffic} comparison={words.ref} />
      <Trend sales={sales} traffic={traffic} />
      <LivePanel />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Behavior traffic={traffic} />
        <Sources traffic={traffic} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <BestSellers sales={sales} />
        <MostViewed traffic={traffic} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Provinces sales={sales} />
        <PaymentMethods sales={sales} />
        <Audience traffic={traffic} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <LandingPages traffic={traffic} />
        <WhatsappPages traffic={traffic} />
      </div>

      <Notes storefrontUrl={live.data?.storefront_url ?? null} />

      {hype && (
        // The page signs off with the motto, as big as the screen allows.
        <section
          className="y2k-manifesto flex flex-col items-center gap-4 px-4 py-10 text-center md:py-14"
          aria-label={t.larp.mottoAria}
        >
          <Motto size="xl" />
          <span className="txt-compact-small-plus text-ui-fg-muted uppercase tracking-[0.3em]">
            {STORE_HANDLE}
          </span>
        </section>
      )}

      {photo && (
        <PhotoMode
          sales={sales.data}
          traffic={traffic.data}
          live={live.data}
          preset={preset}
          onPreset={setPreset}
          onClose={() => setPhoto(false)}
        />
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  // A key, not the words: Medusa looks it up in our menu labels (i18n/menu.ts).
  label: "menu.analytics",
  translationNs: "y2k",
  icon: ChartBar,
})

export default AnalyticsPage
