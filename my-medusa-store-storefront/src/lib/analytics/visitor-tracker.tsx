"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { applyOptOutFromUrl, trackVisitorEvent } from "./visitor-events"

/** While the tab is visible, how often to say "still here". */
const PING_MS = 30_000

const WHATSAPP_LINK = /^https?:\/\/(wa\.me|api\.whatsapp\.com|(web\.)?whatsapp\.com)\//i

/**
 * Feeds the admin dashboard: a page view on every navigation, a ping every 30 s
 * while the tab is visible (that is what "en la tienda ahora" is built from),
 * a leave when the page goes away, and a WhatsApp event on any tap on a
 * WhatsApp link — the checkout's contra-entrega button, the help links, all of
 * them — caught once here instead of in each component.
 */
export default function VisitorTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    applyOptOutFromUrl()
  }, [])

  useEffect(() => {
    // Strict mode runs effects twice in development; one page is one view.
    if (lastTracked.current === pathname) {
      return
    }
    lastTracked.current = pathname
    trackVisitorEvent("pageview")
  }, [pathname])

  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === "visible") {
        trackVisitorEvent("ping")
      }
    }
    const onPageHide = () => trackVisitorEvent("leave")
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]")
      if (link instanceof HTMLAnchorElement && WHATSAPP_LINK.test(link.href)) {
        trackVisitorEvent("whatsapp")
      }
    }

    const timer = window.setInterval(ping, PING_MS)
    document.addEventListener("visibilitychange", ping)
    window.addEventListener("pagehide", onPageHide)
    document.addEventListener("click", onClick, { capture: true })

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", ping)
      window.removeEventListener("pagehide", onPageHide)
      document.removeEventListener("click", onClick, { capture: true })
    }
  }, [])

  return null
}
