import { listProofFaces } from "@lib/data/influencers"
import { getBuyerCount } from "@lib/data/social-proof"
import CreatorAvatar from "@modules/influencers/components/creator-avatar"
import VerifiedBadge from "@modules/influencers/components/verified-badge"

/* Compact social proof, placed beside the price where hesitation happens.
 *
 * Reads as a sentence: "Scott, María y 130 más compraron en Y2K Fit". Clicking
 * it jumps to the client-stories section further down the page.
 *
 * Both inputs degrade independently — no faces, no count, or neither — and the
 * bar simply renders less rather than disappearing or lying. */

const SECTION_ID = "resenas-clientes"

/** Faces shown before the "+N" chip. Three keeps the row legible on a phone. */
const MAX_FACES = 3

const buildSentence = (names: string[], buyers: number): string => {
  const named = names.slice(0, 2)

  // No real names yet — fall back to a count-only statement.
  if (!named.length) {
    return buyers > 0
      ? `${buyers} clientes ya compraron en Y2K Fit`
      : "Clientes reales en Honduras ya compran en Y2K Fit"
  }

  const people =
    named.length === 1 ? named[0] : `${named[0]} y ${named[1]}`

  // Only claim a remainder when the count genuinely exceeds the faces shown.
  const others = buyers - named.length

  return others > 0
    ? `${people} y ${others} clientes más probaron en Y2K Fit`
    : `${people} y otros clientes compraron en Y2K Fit`
}

const BuyerProofBar = async () => {
  const [faces, buyers] = await Promise.all([
    listProofFaces(MAX_FACES),
    getBuyerCount(),
  ])

  // Nothing truthful to show.
  if (!faces.length && buyers <= 0) {
    return null
  }

  const sentence = buildSentence(
    faces.map((face) => face.name),
    buyers
  )

  return (
    <a
      href={`#${SECTION_ID}`}
      className="surface-card flex items-center gap-4 p-4 transition-colors hover:border-brand-sacred-violet"
      style={{ borderColor: "var(--brand-amethyst)" }}
      aria-label={`${sentence}. Ver reseñas de clientes.`}
    >
      {faces.length > 0 && (
        <div className="flex -space-x-3 shrink-0" aria-hidden>
          {faces.map((face) => (
            <div
              key={face.key}
              className="relative rounded-full"
              style={{ boxShadow: "0 0 0 2px var(--brand-void-black)" }}
            >
              <CreatorAvatar src={face.avatar} name={face.name} size={36} />
              {/* Corner check, the way platforms mark a verified avatar. */}
              {face.verified && (
                <VerifiedBadge
                  size={14}
                  ringed
                  className="absolute -bottom-0.5 -right-0.5"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs leading-snug text-brand-ghost-white">
          {sentence}
        </span>
        <span className="text-[11px] text-brand-silver-ash underline underline-offset-2">
          Ver reseñas de clientes
        </span>
      </div>
    </a>
  )
}

export default BuyerProofBar
