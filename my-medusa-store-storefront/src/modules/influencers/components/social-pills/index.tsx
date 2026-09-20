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
    /* Móvil: una pill por fila, alineadas a la izquierda y del mismo ancho —
       en línea quedaban a medio ancho y se veían flotando al centro.
       Desktop: vuelven a fluir una al lado de la otra. */
    <ul className="flex flex-col xsmall:flex-row xsmall:flex-wrap gap-2 items-stretch xsmall:items-center">
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
              className="flex xsmall:inline-flex items-center gap-2 rounded-rounded px-3 py-2 text-xs transition-colors hover:text-brand-ghost-white"
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
              <span className="truncate xsmall:max-w-[12rem]">
                {social.handle || social.platform}
              </span>
              {showFollowers && (
                /* A ancho completo el contador se ancla a la derecha; en línea
                   se queda pegado al handle como antes. */
                <span className="ml-auto xsmall:ml-0 text-brand-ghost-white/90 shrink-0">
                  <span className="hidden xsmall:inline">· </span>
                  {formatFollowers(social.followers as number)}
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
