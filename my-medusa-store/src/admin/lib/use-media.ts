import { useSyncExternalStore } from "react"

/** Whether a media query matches, kept up to date. */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )

/**
 * A phone-width screen. Same breakpoint as the stylesheet's phone rules
 * (theme.css): below it the list pages are cards, above it Medusa's tables.
 */
export const useIsPhone = (): boolean => useMediaQuery("(max-width: 767px)")
