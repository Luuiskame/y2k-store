import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowPath, ChartBar } from "@medusajs/icons"
import { Container, Heading, IconButton, Select, Text, Tooltip } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { LivePanel } from "../../components/analytics/live-panel"
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
import { PRESETS, Preset, useLive, useSales, useTraffic } from "../../lib/analytics"
import { formatRange } from "../../lib/analytics-format"

/** The chosen period is remembered per browser; losing it costs nothing. */
const PRESET_KEY = "y2k-analytics-preset"

/**
 * Chart colors. The blue is the admin's own accent and the grays are one step
 * off its surfaces; all were run through the palette validator for lightness
 * and 3:1 contrast against white and against the dark theme's #212124.
 */
const CHART_COLORS = `
.y2k-analytics {
  --an-series: #3b82f6;
  --an-context: #8e8e96;
  --an-track: rgba(59, 130, 246, 0.14);
  --an-live: #0ca30c;
}
.dark .y2k-analytics {
  --an-context: #71717a;
  --an-track: rgba(59, 130, 246, 0.24);
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
  const [preset, setPreset] = useState<Preset>(readPreset)
  const queryClient = useQueryClient()

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

  const option = PRESETS.find((p) => p.value === preset) ?? PRESETS[0]
  const range = sales.data?.range ?? traffic.data?.range
  const refreshing = sales.isFetching || traffic.isFetching

  return (
    <div className="y2k-analytics flex flex-col gap-y-3">
      <style>{CHART_COLORS}</style>

      <Container className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Heading>Estadísticas</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {range ? formatRange(range.from, range.to) : "Ventas y visitas de la tienda"}{" "}
            · hora de Honduras
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Select
            size="small"
            value={preset}
            onValueChange={(value) => setPreset(value as Preset)}
          >
            <Select.Trigger className="w-[190px]" aria-label="Período">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {PRESETS.map((p) => (
                <Select.Item key={p.value} value={p.value}>
                  {p.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Tooltip content="Actualizar ahora">
            <IconButton
              size="small"
              aria-label="Actualizar ahora"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["y2k-analytics"] })
              }
            >
              <ArrowPath className={refreshing ? "animate-spin" : undefined} />
            </IconButton>
          </Tooltip>
        </div>
      </Container>

      <LivePanel />
      <PendingWork sales={sales} />
      <Summary sales={sales} traffic={traffic} comparison={option.comparison} />
      <Trend sales={sales} traffic={traffic} />

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
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Estadísticas",
  icon: ChartBar,
})

export default AnalyticsPage
