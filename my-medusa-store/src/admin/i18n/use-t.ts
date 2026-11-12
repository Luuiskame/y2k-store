import { useSyncExternalStore } from "react"

import { DICTS, Dict } from "./dictionary"
import { Lang, getLang, subscribeLang } from "./lang"

/** The language in use, re-rendering the component when it changes. */
export const useLang = (): Lang =>
  useSyncExternalStore(subscribeLang, getLang, getLang)

/**
 * The words of the language in use: `const t = useT()` and then
 * `t.analytics.title`. Every component that shows text of its own calls it,
 * so each one follows a change of language by itself instead of counting on
 * a parent to re-render it.
 */
export const useT = (): Dict => DICTS[useLang()]
