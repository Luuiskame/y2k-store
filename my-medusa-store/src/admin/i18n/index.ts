// The saved language is read by the look's boot module; importing it first
// guarantees `getLang()` below already answers with it.
import "../theme/boot"

import { getLang } from "./lang"
import { MENU_NS, menuBundle } from "./menu"

/**
 * What Medusa merges into its own translations when the admin loads (this
 * file's default export is the extension point for that; see README.md).
 *
 * Only the labels of our pages in Medusa's menus live here; every other word
 * of our screens is in ./dict and never goes through i18next. Both of
 * Medusa's languages get the labels of the language OUR screens are in:
 * until someone picks a language in "Ajustes → Apariencia", Medusa can be in
 * English while our pages are in Spanish, and a page's menu entry should
 * read like the page. i18n/dashboard.ts swaps them when the language changes.
 */
const bundle = menuBundle(getLang())

export default {
  en: { [MENU_NS]: bundle },
  es: { [MENU_NS]: bundle },
}
