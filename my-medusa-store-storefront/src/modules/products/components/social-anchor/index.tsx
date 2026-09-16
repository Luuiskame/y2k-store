import {
  BRAND,
  SOCIAL_FOLLOWER_THRESHOLD,
  SOCIAL_FOLLOWERS,
  socialUrls,
} from "@lib/config/brand"
import { formatFollowers } from "@lib/util/format-followers"
import { Facebook, Instagram, TikTok } from "@modules/common/icons/social"

type Platform = {
  key: "tiktok" | "instagram" | "facebook"
  label: string
  handle: string
  url: string
  followers: number
  icon: React.ReactNode
}

const SocialAnchor = () => {
  const platforms: Platform[] = [
    {
      key: "tiktok",
      label: "TikTok",
      handle: `@${BRAND.tiktokHandle}`,
      url: socialUrls.tiktok,
      followers: SOCIAL_FOLLOWERS.tiktok,
      icon: <TikTok />,
    },
    {
      key: "instagram",
      label: "Instagram",
      handle: `@${BRAND.instagramHandle}`,
      url: socialUrls.instagram,
      followers: SOCIAL_FOLLOWERS.instagram,
      icon: <Instagram />,
    },
    {
      key: "facebook",
      label: "Facebook",
      handle: BRAND.facebookHandle,
      url: socialUrls.facebook,
      followers: SOCIAL_FOLLOWERS.facebook,
      icon: <Facebook />,
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
                      {formatFollowers(p.followers)} seguidores
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
