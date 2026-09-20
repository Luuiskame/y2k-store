"use client"

import Image from "next/image"
import { useState } from "react"

/* Avatar with a branded fallback. The feed points at R2 files that may not be
   uploaded yet, so a missing image is a normal state — never a broken icon. */

type CreatorAvatarProps = {
  src?: string
  name: string
  size?: number
}

const CreatorAvatar = ({ src, name, size = 72 }: CreatorAvatarProps) => {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{
        height: size,
        width: size,
        background:
          "radial-gradient(circle at 30% 30%, var(--brand-amethyst) 0%, var(--brand-void-black) 75%)",
        border: "1px solid var(--brand-sacred-violet)",
        boxShadow: "0 0 14px rgba(155, 77, 202, 0.35)",
      }}
    >
      {showImage ? (
        <Image
          src={src as string}
          alt={`${name}, creador de contenido`}
          fill
          sizes={`${size}px`}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-heading uppercase tracking-[0.18em] text-brand-ghost-white/80"
          style={{ fontSize: size / 2.8 }}
        >
          {name.slice(0, 1)}
        </span>
      )}
    </div>
  )
}

export default CreatorAvatar
