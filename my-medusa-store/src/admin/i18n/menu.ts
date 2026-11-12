import { DICTS } from "./dictionary"
import type { Lang } from "./lang"

/**
 * The labels of our own pages in Medusa's menus ("Estadísticas" in the
 * sidebar, "Nuevo pedido" under Orders, "Apariencia" in Settings).
 *
 * Medusa draws those itself, from each route's `label`, so they cannot call
 * our dictionary. What a route can do is name a translation key and a
 * namespace (`defineRouteConfig({ label: "menu.analytics", translationNs })`)
 * and let Medusa's i18next look it up. This is that namespace's content.
 */
export const MENU_NS = "y2k"

export const menuBundle = (lang: Lang) => {
  const { nav } = DICTS[lang].appearance
  return {
    menu: {
      analytics: nav.analytics,
      newOrder: nav.newOrder,
      appearance: nav.appearance,
    },
  }
}
