import { Photo } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"

const SIZES = {
  sm: "h-10 w-8 rounded-md",
  md: "h-14 w-11 rounded-lg",
  lg: "h-20 w-16 rounded-lg",
} as const

/**
 * A product photo in a list, or a placeholder of the same size: when there
 * is no photo, and when the one there is fails to load (a deleted file, no
 * signal), so a list never shows the browser's broken-image mark.
 */
export const Thumb = ({
  src,
  alt = "",
  size = "md",
  className,
}: {
  src: string | null | undefined
  alt?: string
  size?: keyof typeof SIZES
  className?: string
}) => {
  // The address that failed, so a new photo gets its own chance.
  const [failed, setFailed] = useState<string | null>(null)

  return src && failed !== src ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(src)}
      className={clx(
        "bg-ui-bg-component shadow-elevation-card-rest shrink-0 object-cover",
        SIZES[size],
        className
      )}
    />
  ) : (
    <span
      aria-hidden
      className={clx(
        "bg-ui-bg-component text-ui-fg-muted shadow-elevation-card-rest flex shrink-0 items-center justify-center",
        SIZES[size],
        className
      )}
    >
      <Photo />
    </span>
  )
}
