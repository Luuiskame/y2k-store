import fs from "fs"
import path from "path"

import {
  ADMIN_LANG_HEADER,
  adminLangOf,
  adminLangOfMetadata,
  englishBody,
  toEnglish,
} from "../admin-lang"
import { NOT_CONFIGURED_MESSAGE } from "../admin-push"
import { completionBlocker, spanishWorkflowError } from "../manual-orders"

describe("which language the panel is in", () => {
  it("is English only when the panel says so", () => {
    expect(adminLangOf({ [ADMIN_LANG_HEADER]: "en" })).toBe("en")
    expect(adminLangOf({ [ADMIN_LANG_HEADER]: "es" })).toBe("es")
    // The storefront, an earlier panel, anything else: Spanish, as always.
    expect(adminLangOf({})).toBe("es")
    expect(adminLangOf(undefined)).toBe("es")
    expect(adminLangOf({ [ADMIN_LANG_HEADER]: "fr" })).toBe("es")
    expect(adminLangOf({ [ADMIN_LANG_HEADER]: ["en", "es"] })).toBe("es")
    expect(adminLangOf({ "accept-language": "en-US" })).toBe("es")
  })

  it("is the one saved with a user's look, for alerts nobody asked for", () => {
    expect(adminLangOfMetadata({ y2k_theme: { palette: "cine", lang: "en" } })).toBe("en")
    expect(adminLangOfMetadata({ y2k_theme: { palette: "cine", lang: "es" } })).toBe("es")
    // A look saved before there was a language, and no look at all.
    expect(adminLangOfMetadata({ y2k_theme: { palette: "cine" } })).toBe("es")
    expect(adminLangOfMetadata({ push_subscriptions: [] })).toBe("es")
    expect(adminLangOfMetadata(null)).toBe("es")
    expect(adminLangOfMetadata(undefined)).toBe("es")
    expect(adminLangOfMetadata({ y2k_theme: "en" })).toBe("es")
  })
})

describe("toEnglish", () => {
  it("rewords the messages the routes answer with", () => {
    expect(toEnglish("Falta el teléfono del cliente.")).toBe("The customer's phone is missing.")
    expect(toEnglish("Pedido no encontrado.")).toBe("Order not found.")
    expect(toEnglish(NOT_CONFIGURED_MESSAGE)).toMatch(/^Alerts are not configured on the server/)
  })

  it("keeps the value in a message that carries one", () => {
    expect(toEnglish("La tienda no vende a ese país (US). Revisá las regiones en Ajustes.")).toBe(
      "The store does not sell to that country (US). Check the regions in Settings."
    )
    expect(toEnglish("El rango máximo es de 400 días.")).toBe("The maximum range is 400 days.")
  })

  it("finds one of ours inside a longer text", () => {
    // How Medusa reports a validator's message.
    expect(
      toEnglish("Invalid request: Field 'shipping_address, phone' El teléfono debe tener al menos 7 dígitos.")
    ).toBe("Invalid request: Field 'shipping_address, phone' The phone must have at least 7 digits.")
  })

  it("leaves Medusa's own English, and anything unknown, alone", () => {
    expect(toEnglish("Order with id: order_123 was not found")).toBe(
      "Order with id: order_123 was not found"
    )
    expect(toEnglish("")).toBe("")
    expect(toEnglish("Algo que nadie tradujo todavía")).toBe("Algo que nadie tradujo todavía")
  })

  it("covers what stops an order from being created, and Medusa's reworded failures", () => {
    const blockers = [
      completionBlocker(null),
      completionBlocker({ metadata: {} }),
    ].filter((message): message is string => !!message)
    expect(blockers.length).toBe(2)

    const reworded = [
      "Some variant does not have the required inventory",
      "Variants with IDs x do not have a price",
      "Shipping Options are invalid for cart.",
      "Cart is already completed",
      "Timed out acquiring lock",
    ].map((message) => (spanishWorkflowError(new Error(message)) as Error).message)

    for (const message of [...blockers, ...reworded]) {
      expect([message, toEnglish(message) !== message]).toEqual([message, true])
      expect(toEnglish(message)).not.toMatch(/[¿¡ñáéíóú]/)
    }
  })
})

describe("englishBody", () => {
  it("rewords the message of an answer and keeps the rest of it", () => {
    expect(englishBody({ type: "not_found", message: "Pedido no encontrado." })).toEqual({
      type: "not_found",
      message: "Order not found.",
    })
  })

  it("does not touch an answer that is not an error", () => {
    const cart = { cart: { id: "cart_1", message: 5 } }
    expect(englishBody(cart)).toBe(cart)
    const list = [{ message: "Pedido no encontrado." }]
    expect(englishBody(list)).toBe(list)
    expect(englishBody(null)).toBeNull()
    expect(englishBody(undefined)).toBeUndefined()
    expect(englishBody("Pedido no encontrado.")).toBe("Pedido no encontrado.")
  })
})

/**
 * The guard: a message added to an admin route in Spanish and never given
 * its English would reach an English panel as Spanish, and nothing else
 * would notice. This reads the routes' sources and asks for each one.
 */
describe("every message an admin route can answer with", () => {
  const ROOT = path.join(__dirname, "..", "..")
  const SOURCES = ["api/admin", "workflows/manual-orders", "lib/analytics/time.ts"]

  /** Not messages: the name a shipping option falls back to. */
  const NOT_A_MESSAGE = new Set(["Envío"])

  const filesIn = (target: string): string[] => {
    const full = path.join(ROOT, target)
    if (fs.statSync(full).isFile()) {
      return [full]
    }
    return fs
      .readdirSync(full, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? filesIn(path.join(target, entry.name))
          : entry.name.endsWith(".ts")
          ? [path.join(full, entry.name)]
          : []
      )
  }

  /**
   * A sentence in Spanish: it has a letter English does not, or it reads as
   * a sentence (capital, final stop) with a word only Spanish has. The second
   * half is for the ones without an accent ("Pedido no encontrado.").
   */
  const looksSpanish = (literal: string): boolean =>
    /[¿¡ñáéíóú]/.test(literal) ||
    (/^[A-ZÁÉÍÓÚ]/.test(literal) &&
      /[.?!]$/.test(literal) &&
      /\b(el|los|las|del|una|ya|este|ese|esta|pedido|pago|fecha|usa|fue)\b/i.test(literal))

  const spanishLiterals = (source: string): string[] => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    const literals = [...code.matchAll(/"([^"\n]*)"|`([^`]*)`/g)].map(
      (match) => match[1] ?? match[2]
    )
    return literals.filter((literal) => looksSpanish(literal) && !NOT_A_MESSAGE.has(literal))
  }

  const files = SOURCES.flatMap(filesIn)
  const found = files.flatMap((file) =>
    spanishLiterals(fs.readFileSync(file, "utf8")).map((literal) => ({
      file: path.relative(ROOT, file),
      literal,
    }))
  )

  it("finds the messages it is there to guard", () => {
    expect(files.length).toBeGreaterThan(15)
    expect(found.length).toBeGreaterThanOrEqual(12)
    // Among them, ones with no accent to give them away.
    expect(found.map(({ literal }) => literal)).toEqual(
      expect.arrayContaining(["Pedido no encontrado.", "Ese pedido ya fue creado."])
    )
  })

  it.each(found)("has its English: $literal ($file)", ({ literal }) => {
    // A value written into the message can be a word or a number.
    const candidates = [
      literal.replace(/\$\{[^}]*\}/g, "XX"),
      literal.replace(/\$\{[^}]*\}/g, "400"),
    ]
    const translated = candidates.map(toEnglish).find((text, index) => text !== candidates[index])
    expect(translated).toBeDefined()
    expect(translated).not.toMatch(/[¿¡ñáéíóú]/)
  })
})
