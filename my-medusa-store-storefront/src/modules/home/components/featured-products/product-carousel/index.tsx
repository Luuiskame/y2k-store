"use client"

import { ChevronLeft, ChevronRight } from "@medusajs/icons"
import { useRef } from "react"

export default function ProductCarousel({
  children,
}: {
  children: React.ReactNode
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({
      left: dir === "right" ? 220 : -220,
      behavior: "smooth",
    })
  }

  return (
    <div className="relative group/carousel">
      {/* Prev — hidden on desktop */}
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10
          hidden group-hover/carousel:flex small:!hidden items-center justify-center
          w-9 h-9 rounded-full transition-all duration-200"
        style={{
          background: "var(--brand-abyss-purple)",
          border: "1px solid var(--brand-amethyst)",
          color: "var(--brand-sacred-violet)",
        }}
      >
        <ChevronLeft />
      </button>

      {/* Mobile: horizontal scroll. Desktop: 4-col grid */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-2
                   small:grid small:grid-cols-4 small:overflow-visible small:snap-none small:pb-0"
      >
        {children}
      </div>

      {/* Next — hidden on desktop */}
      <button
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10
          hidden group-hover/carousel:flex small:!hidden items-center justify-center
          w-9 h-9 rounded-full transition-all duration-200"
        style={{
          background: "var(--brand-abyss-purple)",
          border: "1px solid var(--brand-amethyst)",
          color: "var(--brand-sacred-violet)",
        }}
      >
        <ChevronRight />
      </button>
    </div>
  )
}
