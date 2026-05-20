"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[storefront] global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1.5rem",
          background: "#0A0A0A",
          color: "#F4F4F5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 560, display: "grid", gap: "1.25rem" }}>
          <div
            aria-hidden
            style={{
              fontSize: "5rem",
              color: "#9B4DCA",
              textShadow: "0 0 24px rgba(155, 77, 202, 0.45)",
              lineHeight: 1,
            }}
          >
            ✟
          </div>
          <h1 style={{ fontSize: "2rem", margin: 0, letterSpacing: "0.05em" }}>
            Ritual en progreso
          </h1>
          <p style={{ margin: 0, color: "#B5B5BD", lineHeight: 1.6 }}>
            Algo se ha roto en el santuario. Estamos trabajando para
            restaurarlo.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                color: "#F4F4F5",
                border: "1px solid #7B2D8E",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            <a
              href="/maintenance"
              style={{
                padding: "0.75rem 1.5rem",
                color: "#F4F4F5",
                border: "1px solid #7B2D8E",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                fontSize: "0.75rem",
                textDecoration: "none",
              }}
            >
              Estado
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
