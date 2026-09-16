import { whatsappLink } from "@lib/config/brand"
import { listInfluencers, type Influencer } from "@lib/data/influencers"
import CreatorAvatar from "@modules/influencers/components/creator-avatar"
import MediaTile from "@modules/influencers/components/media-tile"
import SocialPills from "@modules/influencers/components/social-pills"

/* /colaboraciones — the full creator roster. Reads the same R2 feed as the
   product-page wall. Every field except slug/name is optional, so each block
   below is conditional: a half-filled record renders as much as it has. */

const PITCH_MESSAGE =
  "Hola, creo contenido y me interesa colaborar con Y2K Fit."

const CollabCta = () => (
  <a
    href={whatsappLink(PITCH_MESSAGE)}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center gap-2 rounded-rounded px-5 py-3 text-sm transition-colors w-fit"
    style={{
      background: "var(--brand-void-black)",
      border: "1px solid var(--brand-amethyst)",
      color: "var(--brand-ghost-white)",
    }}
  >
    ¿Creás contenido? Escribinos
  </a>
)

const CreatorCard = ({ influencer }: { influencer: Influencer }) => (
  <article className="surface-card p-6 small:p-8 flex flex-col gap-6">
    <div className="flex items-start gap-5 min-w-0">
      <CreatorAvatar src={influencer.avatar} name={influencer.name} />

      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading uppercase tracking-[0.18em] text-lg small:text-xl text-brand-ghost-white">
            {influencer.name}
          </h2>
          {influencer.city && (
            <span className="text-xs text-brand-silver-ash">
              {influencer.city}
            </span>
          )}
        </div>

        {influencer.tagline && (
          <p className="text-sm text-brand-ghost-white/90 leading-relaxed">
            {influencer.tagline}
          </p>
        )}

        <SocialPills socials={influencer.socials} />
      </div>
    </div>

    {influencer.story && (
      <p className="text-sm text-brand-silver-ash leading-relaxed">
        {influencer.story}
      </p>
    )}

    {influencer.media.length > 0 && (
      <ul className="grid grid-cols-2 small:grid-cols-3 gap-3 small:gap-4">
        {influencer.media.map((media, index) => (
          <li key={`${influencer.slug}-${index}`}>
            <MediaTile
              media={media}
              name={influencer.name}
              sizes="(max-width: 640px) 45vw, 22vw"
            />
          </li>
        ))}
      </ul>
    )}
  </article>
)

const CollabsTemplate = async () => {
  const influencers = await listInfluencers()

  return (
    <section className="content-container py-20 small:py-28 text-brand-silver-ash">
      <header className="mb-12 max-w-3xl flex flex-col gap-6">
        <span className="badge-glow tracking-[0.25em] text-[10px] small:text-xs w-fit">
          COLABORACIONES
        </span>
        <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white">
          Creadores que ya visten Y2K Fit
        </h1>
        <p className="text-base small:text-lg leading-relaxed">
          Mandamos producto a creadores hondureños del gym y la estética oscura.
          No les pedimos que publiquen — los que lo hacen, lo hacen porque la
          prenda les gustó. Acá están.
        </p>
        <CollabCta />
      </header>

      {influencers.length ? (
        <div className="flex flex-col gap-8 small:gap-10">
          {influencers.map((influencer) => (
            <CreatorCard key={influencer.slug} influencer={influencer} />
          ))}
        </div>
      ) : (
        /* No feed, or nothing in it yet. The page still has to say something
           useful — this is a linked route, not a dead end. */
        <div className="surface-card p-6 small:p-8 max-w-3xl flex flex-col gap-4">
          <h2 className="font-heading uppercase tracking-[0.18em] text-lg text-brand-ghost-white">
            Estamos armando la primera tanda
          </h2>
          <p className="text-sm leading-relaxed">
            Las primeras colaboraciones están en camino. Si creás contenido en
            Honduras y te va la estética, escribinos — mandamos producto sin
            compromiso de publicación.
          </p>
          <CollabCta />
        </div>
      )}
    </section>
  )
}

export default CollabsTemplate
