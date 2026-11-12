import { DICTS, Dict } from "./dictionary"
import { getLang } from "./lang"

/**
 * The dictionary of the language in use, for code outside React: formatters,
 * the bottom bar, anything called while rendering. Components use `useT`
 * (i18n/use-t.ts), which also re-renders them when the language changes.
 */
export const tr = (): Dict => DICTS[getLang()]
