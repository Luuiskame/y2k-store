import i18next from "i18next"

import { Lang, getLang, langOfCode, subscribeLang } from "./lang"
import { MENU_NS, menuBundle } from "./menu"

/**
 * Keeps Medusa's own screens in the language of ours.
 *
 * Medusa's dashboard translates itself with i18next (its default instance,
 * the one imported here: extensions are bundled with the dashboard, so it is
 * the same module) and remembers the language per browser. The setting in
 * "Ajustes → Apariencia" is one choice for the whole panel, so the two are
 * tied here, in both directions:
 *
 * - our language changes (the setting, or the account's choice reaching a
 *   new device): Medusa is switched to it;
 * - Medusa's language is changed from its own Profile page: ours follows.
 *   Any language that is not Spanish reads our English screens.
 *
 * What is deliberately not done: forcing Medusa's language on someone who
 * never chose one. Until then they keep exactly what they had (Medusa in
 * whatever it was, our screens in Spanish). Once they have chosen (`unified`
 * in the saved preferences, which travel with the account), Medusa is kept
 * in step on every device and every load: choosing Español on the computer
 * also turns the phone's order pages to Spanish.
 */

const DASHBOARD_LANGS = ["en", "es"]

/** Whether the owner asked for the whole panel in one language. */
let unified = false

/** Our menu entries, relabeled in the language our screens are in. */
const refreshMenu = () => {
  const bundle = menuBundle(getLang())
  for (const code of DASHBOARD_LANGS) {
    i18next.addResourceBundle(code, MENU_NS, bundle, true, true)
  }
}

/** The language Medusa's screens are in, as one of ours; null before it starts. */
export const dashboardLang = (code?: string): Lang | null =>
  i18next.isInitialized ? langOfCode(code ?? i18next.language) : null

/**
 * Puts Medusa's screens in our language. Safe to call at any time and more
 * than once; it is also what makes the menu redraw with its new labels.
 */
export const alignDashboard = () => {
  if (!i18next.isInitialized) {
    return
  }
  try {
    refreshMenu()
    const lang = getLang()
    // Already in step (Spanish, or a language that reads our English): the
    // same code is announced again, which is what redraws the menu.
    const target = langOfCode(i18next.language) === lang ? i18next.language : lang
    void i18next.changeLanguage(target)
  } catch (error) {
    console.error("[y2k-lang] could not switch the panel's language", error)
  }
}

/** Brings Medusa into step when a language was chosen and it is not in it. */
const reconcile = () => {
  if (unified && i18next.isInitialized && langOfCode(i18next.language) !== getLang()) {
    alignDashboard()
  }
}

/**
 * Told by theme/boot.ts every time the preferences are applied: when the
 * panel loads, and when the account's copy arrives on a device that had
 * another one.
 */
export const keepDashboardInStep = (chosen: boolean) => {
  unified = chosen
  reconcile()
}

let started = false

/**
 * `adopt` is called when Medusa's language was changed from Medusa's side
 * and ours has to follow.
 */
export const startDashboardLanguage = (adopt: (lang: Lang) => void) => {
  if (started) {
    return
  }
  started = true

  // After the current change has been applied everywhere, not in the middle.
  subscribeLang(() => queueMicrotask(alignDashboard))

  const listen = () => {
    i18next.on("languageChanged", (code: string) => {
      const lang = langOfCode(code)
      if (lang !== getLang()) {
        adopt(lang)
      }
    })
    reconcile()
  }

  // i18next announces its starting language before it reports being ready.
  // Listening only from then on is what keeps the load from counting as a
  // choice.
  if (i18next.isInitialized) {
    listen()
  } else {
    i18next.on("initialized", listen)
  }
}
