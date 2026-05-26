// Central brand config: contact channels + social handles for the PDP and beyond.
// Edit follower counts when they cross SOCIAL_FOLLOWER_THRESHOLD — counts only
// render publicly once they pass that bar (otherwise we hide them and just show
// the handle + recent activity, which is the right call for a brand still
// building audience).

export const BRAND = {
  founderName: "Luis M",
  founderRole: "Fundador",
  founderQuote:
    "Soy Luis, fundador de Y2K Fit. Nueva tienda local, cada camiseta sale de mi casa revisada a mano.",
  whatsappNumber: "50487466059",
  instagramHandle: "y2kfithn",
  tiktokHandle: "y2kfithn",
  facebookHandle: "y2kfithn",
} as const

export const SOCIAL_FOLLOWER_THRESHOLD = 1000

// Real numbers. When you cross the threshold above, the storefront starts
// showing them automatically; no extra deploy needed.
export const SOCIAL_FOLLOWERS = {
  tiktok: 200,
  instagram: 0,
  facebook: 0,
} as const

export const socialUrls = {
  instagram: `https://instagram.com/${BRAND.instagramHandle}`,
  tiktok: `https://tiktok.com/@${BRAND.tiktokHandle}`,
  facebook: `https://facebook.com/${BRAND.facebookHandle}`,
}

export const whatsappLink = (message: string) =>
  `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`
