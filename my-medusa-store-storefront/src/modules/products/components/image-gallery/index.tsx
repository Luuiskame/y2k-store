"use client"

import { ChevronLeft, ChevronRight } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import Image from "next/image"
import { useRef, useState } from "react"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const SWIPE_THRESHOLD = 40

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const [active, setActive] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)

  if (!images?.length) {
    return (
      <div
        className="aspect-[4/5] w-full rounded-large"
        style={{
          backgroundColor: "var(--brand-abyss-purple)",
          border: "1px solid var(--brand-amethyst)",
        }}
      />
    )
  }

  const total = images.length
  const safeIndex = Math.min(active, total - 1)

  const goTo = (i: number) => {
    const next = (i + total) % total
    setActive(next)
    // Keep the active thumbnail visible on mobile horizontal scroller
    const thumb = thumbsRef.current?.children[next] as HTMLElement | undefined
    thumb?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    })
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      goTo(safeIndex + (dx < 0 ? 1 : -1))
    }
    touchStartX.current = null
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
      {/* Thumbnails — bottom on mobile, left rail on lg+ */}
      <div
        ref={thumbsRef}
        className="order-2 lg:order-1 flex flex-row lg:flex-col gap-2
                   overflow-x-auto lg:overflow-y-auto no-scrollbar
                   lg:w-20 lg:max-h-[640px] lg:flex-shrink-0
                   snap-x lg:snap-y snap-mandatory"
        aria-label="Miniaturas del producto"
      >
        {images.map((image, i) => {
          const isActive = i === safeIndex
          return (
            <button
              type="button"
              key={image.id}
              onClick={() => goTo(i)}
              aria-label={`Ver imagen ${i + 1}`}
              aria-current={isActive ? "true" : undefined}
              className={clx(
                "relative flex-shrink-0 snap-start overflow-hidden rounded-rounded transition-all duration-200",
                "w-16 h-16 lg:w-20 lg:h-20",
                isActive
                  ? "shadow-[0_0_18px_rgba(155,77,202,0.45)]"
                  : "opacity-70 hover:opacity-100"
              )}
              style={{
                border: `1px solid ${
                  isActive
                    ? "var(--brand-sacred-violet)"
                    : "var(--brand-amethyst)"
                }`,
                backgroundColor: "var(--brand-abyss-purple)",
              }}
            >
              {image.url && (
                <Image
                  src={image.url}
                  alt={`Miniatura ${i + 1}`}
                  fill
                  sizes="80px"
                  style={{ objectFit: "cover" }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Main carousel */}
      <div className="order-1 lg:order-2 flex-1 min-w-0">
        <div
          className="surface-card relative aspect-[4/5] w-full overflow-hidden group/gallery"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-roledescription="carousel"
          aria-label="Galería de imágenes del producto"
        >
          <div
            className="flex h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            {images.map((image, i) => (
              <div
                key={image.id}
                className="relative h-full w-full flex-shrink-0"
                aria-hidden={i !== safeIndex}
              >
                {image.url && (
                  <Image
                    src={image.url}
                    priority={i === 0}
                    alt={`Imagen del producto ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 800px"
                    style={{ objectFit: "cover" }}
                  />
                )}
              </div>
            ))}
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(safeIndex - 1)}
                aria-label="Imagen anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10
                           flex items-center justify-center w-10 h-10 rounded-full
                           opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100
                           transition-opacity duration-200"
                style={{
                  background: "rgba(10,10,10,0.6)",
                  border: "1px solid var(--brand-amethyst)",
                  color: "var(--brand-ghost-white)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => goTo(safeIndex + 1)}
                aria-label="Imagen siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10
                           flex items-center justify-center w-10 h-10 rounded-full
                           opacity-0 group-hover/gallery:opacity-100 focus-visible:opacity-100
                           transition-opacity duration-200"
                style={{
                  background: "rgba(10,10,10,0.6)",
                  border: "1px solid var(--brand-amethyst)",
                  color: "var(--brand-ghost-white)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <ChevronRight />
              </button>

              {/* Dot indicator + counter on mobile */}
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10
                           flex lg:hidden items-center gap-2 px-3 py-1.5 rounded-full text-[11px]"
                style={{
                  background: "rgba(10,10,10,0.65)",
                  border: "1px solid var(--brand-amethyst)",
                  color: "var(--brand-ghost-white)",
                  backdropFilter: "blur(6px)",
                }}
                aria-live="polite"
              >
                <span className="font-heading tracking-[0.2em]">
                  {safeIndex + 1} / {total}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageGallery
