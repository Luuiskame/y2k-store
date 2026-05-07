"use client"

import { clx } from "@medusajs/ui"
import { useEffect, useState } from "react"

type InlineAlertProps = {
  message: string
  /** key changes force a fresh dismiss timer (e.g. Date.now()) */
  signal?: number | string | null
  /** ms before auto-hiding. Default 10s — enough to read in Spanish. */
  duration?: number
  variant?: "warning" | "error"
  className?: string
  "data-testid"?: string
}

const InlineAlert = ({
  message,
  signal,
  duration = 10000,
  variant = "warning",
  className,
  "data-testid": dataTestid,
}: InlineAlertProps) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(t)
  }, [signal, duration])

  if (!visible) return null

  const accent =
    variant === "error"
      ? "var(--brand-divine-lilac)"
      : "var(--brand-sacred-violet)"

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid={dataTestid}
      className={clx(
        "flex items-start gap-x-2 rounded-rounded px-3 py-2 mt-2 text-xs font-body",
        className
      )}
      style={{
        background: "var(--brand-void-black)",
        border: `1px solid ${accent}`,
        color: "var(--brand-ghost-white)",
        boxShadow: "0 0 12px rgba(155, 77, 202, 0.25)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 mt-0.5"
        style={{ color: accent }}
        aria-hidden
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M12 7.5V12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
      <span className="leading-snug">{message}</span>
    </div>
  )
}

export default InlineAlert
