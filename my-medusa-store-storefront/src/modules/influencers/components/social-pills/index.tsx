import { SOCIAL_FOLLOWER_THRESHOLD } from "@lib/config/brand"
import type { InfluencerSocial } from "@lib/data/influencers"
import { formatFollowers } from "@lib/util/format-followers"
import { SOCIAL_ICONS } from "@modules/common/icons/social"

/* Social links for one creator. Follower counts render only above the
   threshold in `lib/config/brand` — a small number argues against us, so the
   pill just shows the handle instead. */

const SocialPills = ({ socials }: { socials: InfluencerSocial[] }) => {
  if (!socials.length) {
    return null
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {socials.map((social) => {
        const Icon = SOCIAL_ICONS[social.platform]
        const showFollowers =
          social.followers !== undefined &&
          social.followers >= SOCIAL_FOLLOWER_THRESHOLD

        return (
          <li key={`${social.platform}-${social.url}`}>
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-rounded px-3 py-2 text-xs transition-colors hover:text-brand-ghost-white"
              style={{
                border: "1px solid var(--brand-amethyst)",
                color: "var(--brand-silver-ash)",
              }}
            >
              {Icon && (
                <span
                  aria-hidden
                  className="shrink-0"
                  style={{ color: "var(--brand-sacred-violet)" }}
                >
                  <Icon size="14" />
                </span>
              )}
              <span className="truncate max-w-[12rem]">
                {social.handle || social.platform}
              </span>
              {showFollowers && (
                <span className="text-brand-ghost-white/90">
                  · {formatFollowers(social.followers as number)}
                </span>
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export default SocialPills
