import { SOCIAL_FOLLOWER_THRESHOLD } from "@lib/config/brand"
import {
  listInfluencersForProduct,
  type Influencer,
  type InfluencerMedia,
} from "@lib/data/influencers"
import { formatFollowers } from "@lib/util/format-followers"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SOCIAL_ICONS } from "@modules/common/icons/social"

import MediaTile from "@modules/influencers/components/media-tile"

/* "Ya lo llevan puesto" — creators wearing the product, shown after the trust
   strip. Server-rendered from the R2 feed, so there's no loading state and no
   layout shift. Renders nothing at all when there's no content yet. */

type Tile = {
  key: string
  media: InfluencerMedia
  influencer: Influencer
}

/** Round-robin so one prolific creator can't fill the whole wall. */
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

const CreatorCaption = ({ influencer }: { influencer: Influencer }) => {
  const social = influencer.socials[0]
  const Icon = social ? SOCIAL_ICONS[social.platform] : undefined
  const showFollowers =
    social?.followers !== undefined &&
    social.followers >= SOCIAL_FOLLOWER_THRESHOLD

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
      </div>

      <span className="text-[11px] text-brand-silver-ash truncate">
        {[
          influencer.city,
          showFollowers
            ? `${formatFollowers(social!.followers!)} seguidores`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </div>
  )
}

type CreatorWallProps = {
  productHandle?: string
  countryCode?: string
}

const CreatorWall = async ({ productHandle }: CreatorWallProps) => {
  const { items, matched } = await listInfluencersForProduct(productHandle)
  const tiles = flattenTiles(items, 6)

  // No collabs yet, or none with media — say nothing rather than showing an
  // empty shell.
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
            {matched
              ? "Creadores hondureños con esta prenda puesta. Tocá una foto para ver la publicación original."
              : "Creadores hondureños que ya trabajan con la marca. Tocá una foto para ver la publicación original."}
          </p>
        </header>

        {/* Mobile: snap-scroll row. small+: fixed grid. */}
        <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 small:grid small:grid-cols-3 small:overflow-visible small:pb-0">
          {tiles.map(({ key, media, influencer }) => (
            <li
              key={key}
              className="snap-start shrink-0 w-[62%] xsmall:w-[46%] small:w-auto"
            >
              <MediaTile media={media} name={influencer.name} />
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
