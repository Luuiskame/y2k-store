import { clx } from "@medusajs/ui"

import { useThemePrefs } from "../../lib/theme-sync"

/**
 * The owner's motto, set big in the display face of the type set in use:
 * carved capitals with Cinzel, a gym poster with Big Shoulders, a magazine
 * pull quote with Instrument Serif, a prompt with JetBrains Mono. The face
 * changes with the palette; the words are theirs (Ajustes → Apariencia).
 *
 * Sizes are fluid, so the same line fills a phone and a monitor.
 */
export const Motto = ({
  size = "md",
  className,
}: {
  size?: "md" | "lg" | "xl"
  className?: string
}) => {
  const { motto } = useThemePrefs()

  return (
    <p className={clx("y2k-display y2k-motto", className)} data-size={size}>
      {motto}
    </p>
  )
}
