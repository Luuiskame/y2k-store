import { ArrowDownMini, ArrowUpMini, InformationCircleSolid } from "@medusajs/icons"
import { Badge, Text, Tooltip } from "@medusajs/ui"
import type { ReactNode } from "react"

import { formatPercent } from "../../lib/analytics-format"

/** Under half a percent either way reads as "no change". */
const FLAT = 0.005

/**
 * Change against the comparison period: arrow, sign and color together, so
 * the direction never rests on color alone.
 */
export const Change = ({ value }: { value: number }) => {
  const flat = Math.abs(value) < FLAT
  const up = value > 0

  return (
    <Badge
      size="2xsmall"
      color={flat ? "grey" : up ? "green" : "red"}
      className="gap-x-0.5"
    >
      {!flat && (up ? <ArrowUpMini /> : <ArrowDownMini />)}
      <span className="sr-only">{flat ? "Sin cambio" : up ? "Subió" : "Bajó"}</span>
      {formatPercent(Math.abs(value))}
    </Badge>
  )
}

/** One headline number: label, value, change against the previous period. */
export const StatTile = ({
  label,
  value,
  change,
  hint,
  help,
}: {
  label: string
  /** Already formatted; null while unknown. */
  value: string | null
  /** Relative change, or null when there is nothing to compare with. */
  change?: number | null
  hint?: ReactNode
  help?: string
}) => (
  <div className="bg-ui-bg-base flex min-w-0 flex-col gap-y-2 px-6 py-4">
    <div className="flex items-center gap-x-1">
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {label}
      </Text>
      {help && (
        <Tooltip content={help} maxWidth={280}>
          <span className="text-ui-fg-muted inline-flex" tabIndex={0} aria-label={help}>
            <InformationCircleSolid />
          </span>
        </Tooltip>
      )}
    </div>
    <span className="text-ui-fg-base truncate text-[26px] font-medium leading-8">
      {value ?? "—"}
    </span>
    <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
      {change !== null && change !== undefined && <Change value={change} />}
      {hint && (
        <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )}
    </div>
  </div>
)

/** Tiles on a hairline grid: the gap shows the border color between them. */
export const StatGrid = ({ children }: { children: ReactNode }) => (
  <div className="bg-ui-border-base grid grid-cols-1 gap-px overflow-hidden rounded-lg shadow-elevation-card-rest sm:grid-cols-2 xl:grid-cols-4">
    {children}
  </div>
)
