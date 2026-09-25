import { clx } from "@medusajs/ui"
import { ButtonHTMLAttributes, RefObject, useEffect } from "react"

/**
 * Keeps the pressed chip visible in a row that scrolls sideways on a phone.
 * Without it, a shared link or the back button can restore a filter whose
 * chip sits off-screen, and the shopper can't tell what's filtering the grid.
 * Scrolls the row only, never the page.
 */
export const useRevealPressedChip = (
  row: RefObject<HTMLElement | null>,
  pressedKey: unknown
) => {
  useEffect(() => {
    const el = row.current
    const chip = el?.querySelector<HTMLElement>('[aria-pressed="true"]')

    if (!el || !chip || el.scrollWidth <= el.clientWidth) return

    const offset =
      chip.getBoundingClientRect().left - el.getBoundingClientRect().left

    if (offset < 0 || offset + chip.offsetWidth > el.clientWidth) {
      // 24px: the row's own side padding (px-6)
      el.scrollBy({ left: offset - 24 })
    }
  }, [row, pressedKey])
}

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean
  count?: number
}

/**
 * Toggle chip shared by the home and listing filters. `aria-pressed` carries
 * the state for screen readers, the violet fill carries it for everyone else.
 * 44px tall: it's the main thing a thumb taps on these pages.
 */
const FilterChip = ({
  active,
  count,
  className,
  children,
  ...props
}: FilterChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    className={clx(
      "inline-flex shrink-0 items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-full border",
      "font-heading uppercase tracking-[0.14em] text-[11px] small:text-xs whitespace-nowrap",
      "transition-all duration-200 ease-in",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sacred-violet",
      active
        ? "bg-brand-violet-deep border-brand-violet-deep text-brand-ghost-white shadow-[0_0_20px_rgba(155,77,202,0.45)]"
        : "bg-brand-abyss-purple border-brand-amethyst text-brand-ghost-white hover:border-brand-sacred-violet",
      "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-brand-amethyst",
      className
    )}
    {...props}
  >
    {children}
    {count !== undefined && (
      <span className="font-body tabular-nums tracking-normal opacity-70">
        {count}
      </span>
    )}
  </button>
)

export default FilterChip
