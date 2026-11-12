import type { Lang } from "./lang"
import { alertsEn, alertsEs } from "./dict/alerts"
import { analyticsEn, analyticsEs } from "./dict/analytics"
import { appearanceEn, appearanceEs } from "./dict/appearance"
import { catalogEn, catalogEs } from "./dict/catalog"
import { larpEn, larpEs } from "./dict/larp"
import { manualOrderEn, manualOrderEs } from "./dict/manual-order"
import { ordersEn, ordersEs } from "./dict/orders"
import type { Words } from "./dict/words"

/**
 * Every word the admin's own screens show, in Spanish and in English.
 *
 * Spanish is the original and gives the dictionary its shape: each English
 * section is typed after its Spanish twin (`Words<typeof …>`), so a missing
 * key, an extra one or a function with other arguments does not compile.
 * Strings with a number or a name in them are functions, which keeps plurals
 * and word order where they belong, in the language.
 *
 * Not here, on purpose: what the customer reads (WhatsApp templates and
 * emails). Customers are written to in Spanish whatever language the owner
 * reads the panel in.
 *
 * Why this file is next to the sections' folder and not its `index.ts`:
 * Medusa takes every file named `index` under `src/admin/i18n`, at any
 * depth, for a set of i18next translations and imports its default export.
 * One in `dict/` stops the admin from building.
 */
const es = {
  alerts: alertsEs,
  analytics: analyticsEs,
  appearance: appearanceEs,
  catalog: catalogEs,
  larp: larpEs,
  manualOrder: manualOrderEs,
  orders: ordersEs,
}

export type Dict = Words<typeof es>

const en: Dict = {
  alerts: alertsEn,
  analytics: analyticsEn,
  appearance: appearanceEn,
  catalog: catalogEn,
  larp: larpEn,
  manualOrder: manualOrderEn,
  orders: ordersEn,
}

export const DICTS: Record<Lang, Dict> = { es, en }
