import fs from "fs"
import path from "path"

import { ADMIN_LANG_HEADER } from "../../../lib/admin-lang"
import {
  activityLabel,
  countryName,
  deviceLabel,
  formatBucket,
  formatDay,
  formatDuration,
  formatMoney,
  formatRange,
  pageLabel,
  paymentMethodLabel,
  sourceLabel,
} from "../../lib/analytics-format"
import { validateOrderForm } from "../../lib/manual-order-form"
import {
  formatAgo,
  fulfillmentLabel,
  paymentLabel,
  paymentMethodName,
  summarizeItems,
} from "../../lib/orders-format"
import { priceRange } from "../../lib/products-format"
import { FONT_SETS, PALETTES } from "../../theme/palettes"
import { DICTS } from "../dictionary"
import {
  DEFAULT_LANG,
  LANGS,
  LANG_HEADER,
  dateLocale,
  getLang,
  isLang,
  langOfCode,
  setLang,
  subscribeLang,
} from "../lang"
import { MENU_NS, menuBundle } from "../menu"
import { tr } from "../tr"

type Leaf = { path: string; value: unknown }

/** Every string, function and list of a dictionary, by its path. */
const leaves = (node: unknown, path = ""): Leaf[] =>
  node && typeof node === "object" && !Array.isArray(node)
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, path ? `${path}.${key}` : key)
      )
    : [{ path, value: node }]

const kindOf = (value: unknown) => (Array.isArray(value) ? "list" : typeof value)

/**
 * An argument every dictionary function can take: it reads as "2" in a
 * sentence, is not equal to one (so plurals are exercised), any field asked
 * of it is itself (for the functions that take an object), and called, it
 * answers "2" (for the ones that are handed a formatter).
 */
const sample: any = new Proxy(function () {}, {
  get: (_target, property) => (property === Symbol.toPrimitive ? () => 2 : sample),
  apply: () => "2",
})
const SAMPLE_ARGS = [sample, sample, sample, sample]

const es = leaves(DICTS.es)
const en = leaves(DICTS.en)

afterEach(() => setLang("es"))

describe("the two dictionaries", () => {
  it("have the same entries, of the same kind", () => {
    expect(en.map((leaf) => leaf.path).sort()).toEqual(es.map((leaf) => leaf.path).sort())
    const english = new Map(en.map((leaf) => [leaf.path, leaf.value]))
    for (const { path, value } of es) {
      expect([path, kindOf(english.get(path))]).toEqual([path, kindOf(value)])
    }
    // A dictionary this size that came out nearly empty is a broken import.
    expect(es.length).toBeGreaterThan(400)
  })

  it.each(LANGS)("say something in every entry (%s)", (lang) => {
    for (const { path, value } of leaves(DICTS[lang])) {
      if (typeof value === "function") {
        const said = value(...SAMPLE_ARGS)
        expect([path, typeof said]).toEqual([path, "string"])
        expect([path, said.trim().length > 0]).toEqual([path, true])
        expect([path, /undefined|NaN|\[object/.test(said)]).toEqual([path, false])
      } else if (Array.isArray(value)) {
        expect([path, value.length > 0]).toEqual([path, true])
        for (const line of value) {
          expect([path, typeof line === "string" && line.trim().length > 0]).toEqual([path, true])
        }
      } else {
        expect([path, typeof value]).toEqual([path, "string"])
        // Fragments that are joined to other text may be a space and a word;
        // none may be blank.
        expect([path, (value as string).trim().length > 0]).toEqual([path, true])
      }
    }
  })

  /**
   * English that still has Spanish in it is almost always a line that was
   * copied and not translated. The exceptions are deliberate and listed:
   * the panel's voice mixes the two languages, each language is offered in
   * its own name, and the customer's message keeps its Spanish wording.
   */
  it("leave no Spanish behind in the English one", () => {
    const meant = [
      /^larp\./,
      /^appearance\.language\.(names|taglines)\./,
      /^manualOrder\.carts\.copyWholeMessage$/,
    ]
    const spanish = /[¿¡ñáéíóúÁÉÍÓÚÑ«»]/
    for (const { path, value } of en) {
      if (meant.some((pattern) => pattern.test(path))) {
        continue
      }
      const texts =
        typeof value === "function"
          ? [value(...SAMPLE_ARGS)]
          : Array.isArray(value)
          ? value
          : [value]
      for (const text of texts) {
        expect([path, spanish.test(String(text))]).toEqual([path, false])
      }
    }
  })

  it("actually differ: the English one is not a copy", () => {
    const english = new Map(en.map((leaf) => [leaf.path, leaf.value]))
    const same = es.filter(
      ({ path, value }) => typeof value === "string" && value === english.get(path)
    )
    // Brand names, "Checkout", "Tablet", "Cyber" and the like are the same
    // word in both; a few dozen at most, out of several hundred.
    expect(same.length).toBeLessThan(es.length * 0.08)
  })

  it("name every palette and every type set", () => {
    for (const lang of LANGS) {
      const words = DICTS[lang].appearance
      expect(Object.keys(words.palettes).sort()).toEqual(PALETTES.map((p) => p.id).sort())
      expect(Object.keys(words.fonts).sort()).toEqual(FONT_SETS.map((set) => set.id).sort())
    }
  })

  it("keep the panel's voice the same size in both languages", () => {
    for (const mood of ["quiet", "first", "cooking", "up", "down"] as const) {
      expect(DICTS.en.larp.captions[mood]).toHaveLength(DICTS.es.larp.captions[mood].length)
      expect(DICTS.es.larp.captions[mood].length).toBeGreaterThanOrEqual(2)
    }
    expect(DICTS.en.larp.mantras).toHaveLength(DICTS.es.larp.mantras.length)
    // The ticker repeats them in a loop: a line twice would show twice.
    for (const lang of LANGS) {
      const mantras = DICTS[lang].larp.mantras
      expect(new Set(mantras).size).toBe(mantras.length)
    }
  })
})

describe("the i18n folder", () => {
  /**
   * Medusa's admin build imports the default export of every file named
   * `index` under src/admin/i18n, however deep, as i18next translations. The
   * only one that may exist is the folder's own, which is exactly that. Any
   * other breaks `medusa build` ("default is not exported"), and with it the
   * deploy, while `tsc` and these tests stay green.
   */
  it("has no file named index besides its own", () => {
    const root = path.join(__dirname, "..")
    const indexFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? indexFiles(path.join(dir, entry.name))
          : /^index\.[cm]?[jt]sx?$/.test(entry.name)
          ? [path.relative(root, path.join(dir, entry.name))]
          : []
      )

    expect(indexFiles(root)).toEqual(["index.ts"])
  })
})

describe("the language in use", () => {
  it("starts in Spanish, what every screen was written in", () => {
    expect(DEFAULT_LANG).toBe("es")
    expect(getLang()).toBe("es")
    expect(tr()).toBe(DICTS.es)
  })

  it("changes for everyone at once, and says so only when it changed", () => {
    const heard = jest.fn()
    const stop = subscribeLang(heard)

    setLang("en")
    expect(getLang()).toBe("en")
    expect(tr()).toBe(DICTS.en)
    expect(heard).toHaveBeenCalledTimes(1)

    setLang("en")
    expect(heard).toHaveBeenCalledTimes(1)

    stop()
    setLang("es")
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it("reads any language code as one of the two", () => {
    expect(langOfCode("es")).toBe("es")
    expect(langOfCode("es-HN")).toBe("es")
    expect(langOfCode("ES")).toBe("es")
    expect(langOfCode("en")).toBe("en")
    expect(langOfCode("en-US")).toBe("en")
    // Medusa has many more languages than we do; all of them read English.
    expect(langOfCode("fr")).toBe("en")
    expect(langOfCode("pt-BR")).toBe("en")
    expect(langOfCode(undefined)).toBe("en")
    expect(isLang("es")).toBe(true)
    expect(isLang("fr")).toBe(false)
    expect(isLang(undefined)).toBe(false)
  })

  it("formats dates in the language and money the Honduran way in both", () => {
    expect(dateLocale("es")).toBe("es-HN")
    expect(dateLocale("en")).toBe("en-US")

    const spanish = formatMoney(4500, "hnl")
    expect(spanish).toMatch(/^L\s?4,500\.00$/)
    setLang("en")
    expect(formatMoney(4500, "hnl")).toBe(spanish)
  })

  it("is the header the server reads", () => {
    expect(LANG_HEADER).toBe(ADMIN_LANG_HEADER)
  })
})

describe("our pages in Medusa's menus", () => {
  it("are labeled in the language our screens are in", () => {
    expect(MENU_NS).toBe("y2k")
    expect(menuBundle("es").menu).toEqual({
      analytics: "Estadísticas",
      newOrder: "Nuevo pedido",
      appearance: "Apariencia",
    })
    expect(menuBundle("en").menu).toEqual({
      analytics: "Statistics",
      newOrder: "New order",
      appearance: "Appearance",
    })
  })
})

describe("what the formatters say in English", () => {
  const now = Date.UTC(2026, 10, 11, 18, 0, 0)
  const ago = (ms: number) => formatAgo(new Date(now - ms).toISOString(), now)

  beforeEach(() => setLang("en"))

  it("how long ago", () => {
    expect(ago(10_000)).toBe("now")
    expect(ago(5 * 60_000)).toBe("5 minutes ago")
    expect(ago(60 * 60_000)).toBe("1 hour ago")
    expect(ago(26 * 3600_000)).toBe("yesterday")
    expect(ago(3 * 86400_000)).toBe("3 days ago")
    setLang("es")
    expect(ago(5 * 60_000)).toBe("hace 5 minutos")
  })

  it("dates and durations", () => {
    expect(formatDay("2026-11-11")).toBe("Nov 11")
    expect(formatDay("2026-11-11", { long: true })).toBe("Wed, Nov 11, 2026")
    expect(formatRange("2026-11-01", "2026-11-11")).toBe("Nov 1 – Nov 11")
    expect(formatBucket("15", "hour")).toMatch(/^3\s?PM$/)
    expect(formatBucket("2026-11", "month")).toBe("Nov 2026")
    expect(formatDuration(30_000)).toBe("under 1 min")
    expect(formatDuration(72 * 60_000)).toBe("1 h 12 min")
    setLang("es")
    expect(formatDay("2026-11-11")).toBe("11 nov")
    expect(formatDuration(30_000)).toBe("menos de 1 min")
  })

  it("the states of an order", () => {
    expect(paymentLabel("captured")).toEqual({ label: "Collected", tone: "green" })
    expect(paymentLabel("authorized").label).toBe("To collect")
    expect(fulfillmentLabel("not_fulfilled")).toEqual({ label: "To ship", tone: "red" })
    expect(fulfillmentLabel("shipped").label).toBe("Shipped")
    // An unknown state shows as it comes, in gray, in any language.
    expect(paymentLabel("algo_nuevo")).toEqual({ label: "algo_nuevo", tone: "grey" })
    expect(paymentMethodName("pp_contra-entrega_contra-entrega")).toBe("Cash on delivery")
    expect(paymentMethodName("pp_transferencia-bac_transferencia-bac")).toBe("BAC transfer")
    expect(paymentMethodLabel(null)).toBe("No payment recorded")
    expect(paymentMethodLabel("pp_stripe_stripe")).toBe("Card")
  })

  it("lists, prices and places", () => {
    const items = [
      { title: "Camiseta", variant_title: "M", quantity: 2 },
      { title: "Hoodie", variant_title: null, quantity: 1 },
    ]
    expect(summarizeItems(items, 7)).toBe("2× Camiseta (M), 1× Hoodie and 4 more")
    expect(priceRange({ variants: [] }, "hnl")).toBe("No price")
    expect(pageLabel("/cart")).toBe("Cart")
    expect(pageLabel("/products/camiseta-gotica")).toBe("Product: Camiseta gotica")
    expect(pageLabel("/algo/raro")).toBe("/algo/raro")
    expect(activityLabel("checkout")).toBe("In checkout")
    expect(activityLabel("otra-cosa")).toBe("Browsing")
    expect(deviceLabel("mobile")).toBe("Phone")
    expect(sourceLabel("directo")).toBe("Direct")
    // A brand is a brand in any language.
    expect(sourceLabel("instagram")).toBe("Instagram")
    expect(sourceLabel("algo")).toBe("algo")
    expect(countryName("US")).toBe("United States")
    setLang("es")
    expect(countryName("US")).toBe("Estados Unidos")
    expect(deviceLabel("mobile")).toBe("Celular")
  })

  it("what is wrong with an order being registered", () => {
    const messages = validateOrderForm([], {
      full_name: "",
      phone: "",
      country_code: "hn",
      city: "",
      province: "",
      address_1: "",
      address_2: "",
      company: "",
      email: "no-es-correo",
    }).map((error) => error.message)

    expect(messages).toEqual([
      "Add at least one product.",
      "The customer's name is missing.",
      "The customer's phone is missing.",
      "The city or town is missing.",
      "Choose the department.",
      "The delivery address is missing.",
      "The email doesn't look valid.",
    ])
  })
})
