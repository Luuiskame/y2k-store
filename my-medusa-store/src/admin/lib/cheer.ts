import type { Dict } from "../i18n/dictionary"
import { tr } from "../i18n/tr"
import { getThemePrefs } from "../theme/boot"

/**
 * A success message with the panel's word of approval after it, while "Modo
 * larp" is on: "Pedido creado. W.". Only ever on something that went well:
 * errors, warnings and questions are never dressed up.
 */
export const cheer = (message: string, kind: keyof Dict["larp"]["cheers"]): string =>
  getThemePrefs().hype ? `${message} ${tr().larp.cheers[kind]}` : message
