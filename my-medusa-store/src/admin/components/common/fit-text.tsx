import { clx } from "@medusajs/ui"
import { useLayoutEffect, useRef } from "react"

/**
 * One line of text as large as its container allows, up to `max` pixels.
 *
 * For headline figures: "L 980.00" and "L 117,360.00" should both fill the
 * card, and the type sets differ a lot in width (Unbounded is nearly twice
 * as wide as Big Shoulders), so no fixed size or viewport unit fits them
 * all. The text is measured at `max` and scaled down to fit; it is measured
 * again when the container, the text or the font changes.
 */
export const FitText = ({
  children,
  max,
  min = 18,
  className,
}: {
  children: string
  /** Largest font size, in pixels. */
  max: number
  /** Smallest font size, in pixels; below it the text may overflow. */
  min?: number
  /** For the text itself (color, gradient, weight). */
  className?: string
}) => {
  const box = useRef<HTMLSpanElement>(null)
  const text = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const container = box.current
    const element = text.current
    if (!container || !element) {
      return
    }

    const fit = () => {
      element.style.fontSize = `${max}px`
      const natural = element.getBoundingClientRect().width
      const available = container.clientWidth
      if (natural > available && natural > 0 && available > 0) {
        element.style.fontSize = `${Math.max(
          min,
          Math.floor((max * available) / natural)
        )}px`
      }
    }

    fit()
    // The container resizes with the screen; the text resizes when a web
    // font arrives or the type set is changed in Apariencia.
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    observer.observe(element)
    return () => observer.disconnect()
  }, [children, max, min])

  return (
    <span ref={box} className="block w-full min-w-0">
      <span
        ref={text}
        className={clx("inline-block whitespace-nowrap", className)}
        style={{ fontSize: max }}
      >
        {children}
      </span>
    </span>
  )
}
