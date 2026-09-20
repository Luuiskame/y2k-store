import React from "react"

/* Verified check for creators we've actually collaborated with.
 *
 * Blue, matching the convention people already read as "verified" — it's
 * instantly legible in a way a custom colour isn't. Because the blue check
 * carries a platform association, the label spells out whose claim it is:
 * Y2K Fit confirms the collab, Instagram is not vouching for anything. The
 * legend in the client-stories section says the same thing on-page.
 *
 * The title/aria pair matters — a bare glyph next to a name is meaningless to a
 * screen reader and ambiguous to anyone who hasn't seen it before. */

/** Slightly deeper than Instagram's #3897F0 so it reads as ours on a dark
 *  background while staying unmistakably "verified blue". */
const BADGE_BLUE = "#1D9BF0"

type VerifiedBadgeProps = {
  size?: number
  /** Overrides the default tooltip/label wording. */
  label?: string
  /** Dark ring for badges sitting on top of a photo, so the disc stays
   *  readable against whatever is behind it. */
  ringed?: boolean
  className?: string
}

const VerifiedBadge = ({
  size = 14,
  label = "Colaboración verificada por Y2K Fit",
  ringed = false,
  className,
}: VerifiedBadgeProps) => (
  <span
    className={`inline-flex shrink-0 align-middle ${
      ringed ? "rounded-full" : ""
    } ${className ?? ""}`}
    title={label}
    style={
      ringed
        ? { boxShadow: "0 0 0 1.5px var(--brand-void-black)" }
        : undefined
    }
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* A plain disc, not a scalloped star: the points of a star collapse into
          stray specks at the 13-16px sizes this renders at. */}
      <circle cx="12" cy="12" r="11" fill={BADGE_BLUE} />
      {/* Stroked check rather than a filled outline — stays crisp when small.
          Weight 3.4 puts the check at ~13% of the disc; thinner than that and
          it disappears at the 13px this renders at on a phone. */}
      <path
        d="M7.2 12.4l3.2 3.2 6.4-6.9"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
)

export default VerifiedBadge
