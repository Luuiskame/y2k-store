import { socialUrls } from "@lib/config/brand"
import { listProofFaces } from "@lib/data/influencers"
import { getBuyerCount } from "@lib/data/social-proof"
import CreatorAvatar from "@modules/influencers/components/creator-avatar"
import VerifiedBadge from "@modules/influencers/components/verified-badge"
import { Instagram } from "@modules/common/icons/social"

/* Client stories — the landing spot for the trust bar's link.
 *
 * We don't rehost the stories: Instagram's tagged-story URLs are signed and
 * expire within days, so any copy we cached would rot. Instead this points at
 * the profile where the highlights already live and stay current. */

const SECTION_ID = "resenas-clientes"

/** Faces here can be more generous than the trust bar's three. */
const MAX_FACES = 8

const ClientStories = async () => {
  const [faces, buyers] = await Promise.all([
    listProofFaces(MAX_FACES),
    getBuyerCount(),
  ])

  /* Con una o dos caras, una columna aparte se ve vacía: en ese caso van
     debajo del texto y la tarjeta se centra. A partir de tres, la columna
     derecha se llena y el ancho de desktop se aprovecha. */
  const sideBySide = faces.length >= 3

  return (
    <section
      id={SECTION_ID}
      aria-label="Reseñas de clientes"
      // scroll-mt clears the sticky header when the trust bar jumps here.
      className="content-container pb-12 small:pb-16 scroll-mt-28"
    >
      {/* Desktop: texto a la izquierda, caras a la derecha. En una sola columna
          la tarjeta dejaba media pantalla vacía. */}
      <div
        className={
          sideBySide
            ? "surface-card p-6 small:p-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-8 lg:gap-12 lg:items-center"
            : "surface-card p-6 small:p-8 flex flex-col gap-6 max-w-3xl mx-auto"
        }
      >
        <header className="flex flex-col gap-2 min-w-0">
          <span className="badge-glow tracking-[0.25em] text-[10px] w-fit">
            CLIENTES
          </span>
          <h2 className="font-heading uppercase tracking-[0.18em] text-xl small:text-2xl text-brand-ghost-white">
            Reseñas de clientes
          </h2>
          <p className="text-sm text-brand-silver-ash leading-relaxed">
            {buyers > 0
              ? `${buyers} clientes ya probaron Y2K Fit. Muchos nos etiquetan en sus historias con la prenda puesta — las guardamos todas en los destacados de nuestro Instagram.`
              : "Nuestros clientes nos etiquetan en sus historias con la prenda puesta — las guardamos todas en los destacados de nuestro Instagram."}
          </p>
          <p className="text-xs text-brand-silver-ash/80 leading-relaxed">
            No todos nuestros clientes nos etiquetan, y está perfecto: muchos
            prefieren entrenar tranquilos sin aparecer. Acá están los que
            quisieron compartirlo.
          </p>
          {/* A check mark with no legend is just decoration — say what it means. */}
          {/* <p className="text-xs text-brand-silver-ash/80 leading-relaxed flex items-center gap-1.5 flex-wrap">
            <VerifiedBadge size={13} />
            <span>
              El check azul marca una colaboración que confirmamos nosotros, no
              una verificación de Instagram.
            </span>
          </p> */}

          <a
            href={socialUrls.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-rounded px-5 py-3 text-sm transition-colors w-fit"
            style={{
              background: "var(--brand-void-black)",
              border: "1px solid var(--brand-amethyst)",
              color: "var(--brand-ghost-white)",
            }}
          >
            <span aria-hidden style={{ color: "var(--brand-sacred-violet)" }}>
              <Instagram size="16" />
            </span>
            Ver las historias en Instagram
          </a>
        </header>

        {faces.length > 0 && (
          /* Móvil: fila que se desborda. Desktop: rejilla compacta al lado del
             texto, con ancho tope para que 1-2 caras no se estiren raro. */
          <ul
            className={
              sideBySide
                ? "flex flex-wrap gap-4 lg:grid lg:grid-cols-4 lg:gap-5 lg:max-w-[20rem] lg:shrink-0"
                : "flex flex-wrap gap-4"
            }
          >
            {faces.map((face) => (
              <li
                key={face.key}
                className="flex flex-col items-center gap-2 w-16 lg:w-auto"
              >
                <div className="relative">
                  <CreatorAvatar src={face.avatar} name={face.name} size={56} />
                  {face.verified && (
                    <VerifiedBadge
                      size={18}
                      ringed
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  )}
                </div>
                <span className="text-[11px] text-brand-silver-ash text-center leading-tight truncate w-full">
                  {face.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default ClientStories
