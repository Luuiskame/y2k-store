"use client"

import { useId } from "react"

type RatingStarsProps = {
  rating: number
  size?: "sm" | "md"
}

const Star = ({
  fill,
  size,
  clipId,
}: {
  fill: number
  size: number
  clipId: string
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
    <defs>
      <clipPath id={clipId}>
        <rect x="0" y="0" width={24 * fill} height="24" />
      </clipPath>
    </defs>
    <path
      d="M12 2.5l2.95 6.36 6.95.66-5.25 4.79 1.6 6.84L12 17.77l-6.25 3.38 1.6-6.84L2.1 9.52l6.95-.66L12 2.5z"
      fill="none"
      stroke="var(--brand-amethyst)"
      strokeWidth="1.4"
    />
    <path
      d="M12 2.5l2.95 6.36 6.95.66-5.25 4.79 1.6 6.84L12 17.77l-6.25 3.38 1.6-6.84L2.1 9.52l6.95-.66L12 2.5z"
      fill="var(--brand-sacred-violet)"
      clipPath={`url(#${clipId})`}
      style={{ filter: "drop-shadow(0 0 4px rgba(155, 77, 202, 0.55))" }}
    />
  </svg>
)

const RatingStars = ({ rating, size = "sm" }: RatingStarsProps) => {
  const baseId = useId()
  const px = size === "sm" ? 14 : 18
  const clamped = Math.max(0, Math.min(5, rating))
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${clamped.toFixed(1)} de 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i))
        return <Star key={i} fill={fill} size={px} clipId={`${baseId}-${i}`} />
      })}
    </span>
  )
}

export default RatingStars
