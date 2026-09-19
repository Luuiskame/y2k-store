import { SOCIAL_FOLLOWER_THRESHOLD } from "@lib/config/brand"
import {
  listInfluencersForProduct,
  type Influencer,
  type InfluencerMedia,
  type InfluencerSocial,
} from "@lib/data/influencers"
import { formatFollowers } from "@lib/util/format-followers"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SOCIAL_ICONS } from "@modules/common/icons/social"
import MediaTile from "@modules/influencers/components/media-tile"
import VerifiedBadge from "@modules/influencers/components/verified-badge"

/* "Ya lo llevan puesto" — creator clips, shown after the trust strip.
 *
 * Clips only, three at most: on a product page a short video of someone moving
 * in the shirt outsells a still, and more than three turns the section into a
 * second gallery competing with the product's own. Photos still live on
 * /colaboraciones.
 *
 * Server-rendered from the R2 feed, so there's no loading state and no layout
 * shift. Renders nothing at all when no targeted creator has a clip. */

const MAX_TILES = 3

type Tile = {
  key: string
  media: InfluencerMedia
  influencer: Influencer
}

/** Round-robin so one prolific creator can't fill all three slots. */
const flattenTiles = (influencers: Influencer[], limit: number): Tile[] => {
  const tiles: Tile[] = []
  const depth = Math.max(...influencers.map((i) => i.media.length), 0)

  for (let index = 0; index < depth && tiles.length < limit; index++) {
    for (const influencer of influencers) {
      const media = influencer.media[index]
      if (!media) {
        continue
      }
      tiles.push({ key: `${influencer.slug}-${index}`, media, influencer })
      if (tiles.length >= limit) {
        break
      }
    }
  }

  return tiles
}

/* The tile has room for one platform, so show the creator's strongest: a 1.5M
   TikTok shouldn't be hidden because a 600-follower Instagram is listed first. */
const primarySocial = (influencer: Influencer) =>
  influencer.socials.reduce<InfluencerSocial | undefined>(
    (best, candidate) =>
      (candidate.followers ?? -1) > (best?.followers ?? -1) ? candidate : best,
    influencer.socials[0]
  )

const CreatorCaption = ({ influencer }: { influencer: Influencer }) => {
  const social = primarySocial(influencer)
  const Icon = social ? SOCIAL_ICONS[social.platform] : undefined
  const showFollowers =
    social?.followers !== undefined &&
    social.followers >= SOCIAL_FOLLOWER_THRESHOLD

  const meta = [
    influencer.city,
    showFollowers ? `${formatFollowers(social!.followers!)} seguidores` : null,
  ].filter(Boolean)

  return (
    <div className="mt-3 flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <span
            aria-hidden
            className="shrink-0"
            style={{ color: "var(--brand-sacred-violet)" }}
          >
            <Icon size="14" />
          </span>
        )}
        <span className="font-heading uppercase tracking-[0.16em] text-[11px] text-brand-ghost-white truncate">
          {social?.handle || influencer.name}
        </span>
        <VerifiedBadge size={13} />
      </div>

      {meta.length > 0 && (
        <span className="text-[11px] text-brand-silver-ash truncate">
          {meta.join(" · ")}
        </span>
      )}
    </div>
  )
}

type CreatorWallProps = {
  productHandle?: string
  collectionHandle?: string
}

const CreatorWall = async ({
  productHandle,
  collectionHandle,
}: CreatorWallProps) => {
  const { items, matched } = await listInfluencersForProduct(
    { productHandle, collectionHandle },
    { limit: MAX_TILES, onlyVideo: true }
  )

  const tiles = flattenTiles(items, MAX_TILES)

  // No targeted creator with a clip — say nothing rather than show an empty
  // shell or fall back to stills.
  if (!tiles.length) {
    return null
  }

  return (
    <section
      aria-label="Colaboraciones con creadores"
      className="content-container pb-12 small:pb-16"
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className="badge-glow tracking-[0.25em] text-[10px] w-fit">
            COLABORACIONES
          </span>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            {matched ? "Ya lo llevan puesto" : "Creadores que ya visten Y2K Fit"}
          </h2>
          <p className="text-sm text-brand-silver-ash leading-relaxed max-w-2xl">
            Creadores hondureños en movimiento con la prenda. Tocá un video para
            verlo completo en su perfil.
          </p>
        </header>

        {/* Mobile: snap-scroll row. small+: up to three portrait tiles, capped
            so they stay a supporting section, not a second gallery. */}
        <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 small:grid small:grid-cols-3 small:max-w-3xl small:overflow-visible small:pb-0">
          {tiles.map(({ key, media, influencer }) => (
            <li
              key={key}
              className="snap-start shrink-0 w-[58%] xsmall:w-[42%] small:w-auto"
            >
              <MediaTile
                media={media}
                name={influencer.name}
                aspect="portrait"
                sizes="(max-width: 640px) 58vw, 250px"
              />
              <CreatorCaption influencer={influencer} />
            </li>
          ))}
        </ul>

        <LocalizedClientLink
          href="/colaboraciones"
          className="text-sm text-brand-silver-ash hover:text-brand-ghost-white transition-colors w-fit"
        >
          Ver todas las colaboraciones →
        </LocalizedClientLink>
      </div>
    </section>
  )
}

export default CreatorWall
