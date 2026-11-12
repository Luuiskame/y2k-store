import { clx } from "@medusajs/ui"
import type { CSSProperties } from "react"

/** Seconds per character: the band moves at the same calm pace however long it is. */
const PACE = 0.3
const SHORTEST_LOOP_S = 24

/**
 * A band of short lines that slides sideways without end, like the ticker
 * under a scoreboard.
 *
 * It is decoration and behaves like it: nothing on it can be clicked or
 * focused, assistive technology skips it (every figure on it is elsewhere on
 * the page as plain text), it is one transform on its own layer, and with
 * "reduce motion" on it simply stands still. See `.y2k-ticker` in theme.css.
 */
export const Ticker = ({
  items,
  className,
}: {
  items: string[]
  className?: string
}) => {
  if (items.length === 0) {
    return null
  }

  // In steps of six seconds: a figure gaining a digit does not change the
  // pace, which would make the band jump.
  const seconds = Math.max(
    SHORTEST_LOOP_S,
    Math.ceil((items.join(" ").length * PACE) / 6) * 6
  )
  // The same run twice: when the first has slid out, the second is exactly
  // where the first started, and the loop has no seam.
  const run = (
    <span className="y2k-ticker-run">
      {items.map((item, index) => (
        <span key={index} className="y2k-ticker-item">
          {item}
        </span>
      ))}
    </span>
  )

  return (
    <div
      className={clx("y2k-ticker", className)}
      aria-hidden
      style={{ "--y2k-ticker-seconds": `${seconds}s` } as CSSProperties}
    >
      <div className="y2k-ticker-track">
        {run}
        {run}
      </div>
    </div>
  )
}
