import { Text } from "@medusajs/ui"
import type { ReactNode } from "react"

import { Empty } from "./section"

export type BarItem = {
  key: string
  label: ReactNode
  /** What the bar length encodes. */
  value: number
  /** The value as shown, already formatted. */
  display: string
  /** Secondary figure after the value, e.g. a share or a second count. */
  detail?: string
  leading?: ReactNode
}

/**
 * A ranked list: label and value in text, and a thin bar in one color under
 * each row. The categories carry no order of their own, so every bar is the
 * same hue; only the length says how much.
 */
export const BarList = ({
  items,
  empty,
  max,
}: {
  items: BarItem[]
  empty: string
  /** Full-length value. Defaults to the largest item; pass a total for shares. */
  max?: number
}) => {
  if (items.length === 0) {
    return <Empty>{empty}</Empty>
  }

  const scale = max ?? Math.max(...items.map((item) => item.value), 0)
  // A sliver for small non-zero values so they stay visible; nothing for zero.
  const widthOf = (value: number) =>
    scale > 0 && value > 0 ? Math.min(100, Math.max(2, (value / scale) * 100)) : 0

  return (
    <ul className="-mx-2 flex flex-col gap-y-1">
      {items.map((item) => (
        <li
          key={item.key}
          className="hover:bg-ui-bg-base-hover flex flex-col gap-y-1.5 rounded-md px-2 py-1.5 transition-colors"
        >
          <div className="flex items-center justify-between gap-x-3">
            <div className="flex min-w-0 items-center gap-x-2">
              {item.leading}
              <Text size="small" leading="compact" className="truncate">
                {item.label}
              </Text>
            </div>
            <div className="flex shrink-0 items-baseline gap-x-2">
              <Text size="small" leading="compact" weight="plus" className="tabular-nums">
                {item.display}
              </Text>
              {item.detail && (
                <Text size="xsmall" leading="compact" className="text-ui-fg-muted tabular-nums">
                  {item.detail}
                </Text>
              )}
            </div>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--an-track)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${widthOf(item.value)}%`,
                backgroundColor: "var(--an-series)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Product image in the list, or an empty square of the same size. */
export const ProductThumb = ({ src, alt }: { src: string | null; alt: string }) =>
  src ? (
    <img
      src={src}
      alt={alt}
      className="shadow-elevation-card-rest h-8 w-6 shrink-0 rounded object-cover"
      loading="lazy"
    />
  ) : (
    <span
      aria-hidden
      className="bg-ui-bg-component shadow-elevation-card-rest h-8 w-6 shrink-0 rounded"
    />
  )
