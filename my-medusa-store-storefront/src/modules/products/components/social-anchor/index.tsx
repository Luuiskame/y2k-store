import {
  BRAND,
  SOCIAL_FOLLOWER_THRESHOLD,
  SOCIAL_FOLLOWERS,
  socialUrls,
} from "@lib/config/brand"

type Platform = {
  key: "tiktok" | "instagram" | "facebook"
  label: string
  handle: string
  url: string
  followers: number
  icon: React.ReactNode
}

const TikTokIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.66a8.16 8.16 0 0 0 4.77 1.52V6.73a4.85 4.85 0 0 1-1.84-.04z" />
  </svg>
)

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.6-1.6h1.7V4.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.5H7.7V14h2.6v8h3.2z" />
  </svg>
)

const formatCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`

const SocialAnchor = () => {
  const platforms: Platform[] = [
    {
      key: "tiktok",
      label: "TikTok",
      handle: `@${BRAND.tiktokHandle}`,
      url: socialUrls.tiktok,
      followers: SOCIAL_FOLLOWERS.tiktok,
      icon: <TikTokIcon />,
    },
    {
      key: "instagram",
      label: "Instagram",
      handle: `@${BRAND.instagramHandle}`,
      url: socialUrls.instagram,
      followers: SOCIAL_FOLLOWERS.instagram,
      icon: <InstagramIcon />,
    },
    {
      key: "facebook",
      label: "Facebook",
      handle: BRAND.facebookHandle,
      url: socialUrls.facebook,
      followers: SOCIAL_FOLLOWERS.facebook,
      icon: <FacebookIcon />,
    },
  ]

  return (
    <section
      aria-label="Síguenos"
      className="content-container pb-16 small:pb-20"
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Síguenos
          </h2>
          <p className="mt-2 text-sm text-brand-silver-ash leading-relaxed">
            Drops, probadores y contenido detrás de cámara.
          </p>
        </header>

        <div className="grid grid-cols-1 small:grid-cols-3 gap-4">
          {platforms.map((p) => {
            const showCount = p.followers >= SOCIAL_FOLLOWER_THRESHOLD
            return (
              <a
                key={p.key}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="surface-card p-5 flex items-center gap-4 transition-colors hover:border-brand-sacred-violet"
                style={{ borderColor: "var(--brand-amethyst)" }}
              >
                <span
                  aria-hidden
                  className="shrink-0"
                  style={{ color: "var(--brand-sacred-violet)" }}
                >
                  {p.icon}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="font-heading uppercase tracking-[0.18em] text-xs text-brand-ghost-white">
                    {p.label}
                  </span>
                  <span className="text-xs text-brand-silver-ash truncate">
                    {p.handle}
                  </span>
                  {showCount && (
                    <span className="mt-1 text-xs text-brand-ghost-white/90">
                      {formatCount(p.followers)} seguidores
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default SocialAnchor
