"use client"

import { useIntersection } from "@lib/hooks/use-in-view"
import type { InfluencerMedia } from "@lib/data/influencers"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

/* One square tile in the creator wall.
 *
 * Media URLs come from a hand-edited feed and may point at files that were
 * renamed, deleted, or never uploaded — so a failed load is an expected state,
 * not an exception. Both branches fall back to a branded placeholder rather
 * than a broken-image icon. */

const Placeholder = ({ name }: { name: string }) => (
  <div
    className="absolute inset-0 flex items-center justify-center"
    style={{
      background:
        "radial-gradient(circle at 30% 25%, var(--brand-amethyst) 0%, var(--brand-void-black) 78%)",
    }}
    aria-hidden
  >
    <span className="font-heading uppercase tracking-[0.2em] text-2xl text-brand-ghost-white/50">
      {name.slice(0, 1)}
    </span>
  </div>
)

const PlayBadge = () => (
  <span
    aria-hidden
    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full"
    style={{
      background: "rgba(10, 10, 10, 0.72)",
      border: "1px solid var(--brand-sacred-violet)",
    }}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path
        d="M8 5v14l11-7z"
        style={{ fill: "var(--brand-ghost-white)" }}
      />
    </svg>
  </span>
)

type MediaTileProps = {
  media: InfluencerMedia
  name: string
  /** Drives next/image sizing; the wall and the collabs page differ. */
  sizes?: string
  /** Clips are shot vertically — "portrait" crops far less of the frame. */
  aspect?: "square" | "portrait"
}

const MediaTile = ({
  media,
  name,
  sizes = "(max-width: 640px) 60vw, 30vw",
  aspect = "square",
}: MediaTileProps) => {
  const [failed, setFailed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = media.type === "video"
  // Generous margin so the clip is ready by the time the tile is on screen.
  const inView = useIntersection(containerRef, "200px")

  useEffect(() => {
    const video = videoRef.current
    if (!isVideo || !video) {
      return
    }

    if (inView) {
      // Autoplay can be refused (low-power mode, data saver). Silent clips are
      // decoration — losing one is not an error worth surfacing.
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [inView, isVideo])

  const body = (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-rounded ${
        aspect === "portrait" ? "aspect-[3/4]" : "aspect-square"
      }`}
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      {failed ? (
        <Placeholder name={name} />
      ) : isVideo ? (
        <video
          ref={videoRef}
          src={media.url}
          poster={media.poster}
          muted
          loop
          playsInline
          // With no poster, "none" would leave a black box until playback
          // starts — pull just enough to paint the first frame.
          preload={media.poster ? "none" : "metadata"}
          aria-label={media.alt}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Image
          src={media.url}
          alt={media.alt}
          fill
          sizes={sizes}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      )}

      {isVideo && !failed && <PlayBadge />}
    </div>
  )

  if (!media.postUrl) {
    return body
  }

  return (
    <a
      href={media.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block transition-opacity hover:opacity-90"
      aria-label={`Ver la publicación de ${name}`}
    >
      {body}
    </a>
  )
}

export default MediaTile
