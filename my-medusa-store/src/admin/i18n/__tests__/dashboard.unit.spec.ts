import i18next from "i18next"

import {
  alignDashboard,
  dashboardLang,
  keepDashboardInStep,
  startDashboardLanguage,
} from "../dashboard"
import { Lang, getLang, setLang } from "../lang"
import { MENU_NS } from "../menu"

/**
 * The real i18next, the way Medusa's dashboard starts it (resources given up
 * front, its default instance), so what is tested is the actual order of its
 * events and not a guess at it. The tests run in order and share the
 * instance, like one visit to the panel.
 */

/** Our side of the bridge as theme/boot.ts wires it, minus the storage. */
const adopt = jest.fn((lang: Lang) => setLang(lang))

/** Lets the bridge's deferred work (a microtask) and i18next's answer run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const menuLabel = () => i18next.t("menu.analytics", { ns: MENU_NS })

describe("Medusa's language and ours", () => {
  it("leaves both as they were when the panel loads", async () => {
    expect(dashboardLang()).toBeNull()
    // Before Medusa has started nothing can be switched, and nothing throws.
    expect(() => alignDashboard()).not.toThrow()

    startDashboardLanguage(adopt)
    await i18next.init({
      lng: "en",
      fallbackLng: "en",
      resources: {
        en: { translation: { orders: "Orders" } },
        es: { translation: { orders: "Pedidos" } },
        fr: { translation: { orders: "Commandes" } },
      },
    })
    await settle()

    // Medusa announcing the language it starts in is not somebody choosing
    // it: our screens stay in Spanish next to a Medusa in English, which is
    // what everyone had before there was a setting.
    expect(adopt).not.toHaveBeenCalled()
    expect(getLang()).toBe("es")
    expect(i18next.language).toBe("en")
    expect(dashboardLang()).toBe("en")
  })

  it("makes the panel one language when ours is chosen, even the one already on", async () => {
    // "Español" tapped while it is already selected: the settings page calls
    // this itself, because our language did not change.
    alignDashboard()
    await settle()

    expect(i18next.language).toBe("es")
    expect(i18next.t("orders")).toBe("Pedidos")
    expect(getLang()).toBe("es")
    expect(adopt).not.toHaveBeenCalled()
  })

  it("switches Medusa whenever ours changes", async () => {
    setLang("en")
    await settle()
    expect(i18next.language).toBe("en")
    expect(i18next.t("orders")).toBe("Orders")

    setLang("es")
    await settle()
    expect(i18next.language).toBe("es")
    // Our own switches are not reported back to us as Medusa's.
    expect(adopt).not.toHaveBeenCalled()
  })

  it("follows a language chosen on Medusa's own Profile page", async () => {
    await i18next.changeLanguage("en")
    await settle()

    expect(adopt).toHaveBeenCalledTimes(1)
    expect(adopt).toHaveBeenLastCalledWith("en")
    expect(getLang()).toBe("en")
    // And it stops there: adopting it does not bounce back and forth.
    expect(i18next.language).toBe("en")
    expect(adopt).toHaveBeenCalledTimes(1)
  })

  it("reads a language we do not have as English, and lets Medusa keep it", async () => {
    await i18next.changeLanguage("es")
    await settle()
    expect(getLang()).toBe("es")
    adopt.mockClear()

    await i18next.changeLanguage("fr")
    await settle()

    expect(adopt).toHaveBeenCalledTimes(1)
    expect(adopt).toHaveBeenLastCalledWith("en")
    expect(getLang()).toBe("en")
    // Medusa is not dragged to English because we only have two languages.
    expect(i18next.language).toBe("fr")
    expect(i18next.t("orders")).toBe("Commandes")
    expect(dashboardLang()).toBe("en")
  })

  it("labels our pages in Medusa's menus in our language, whatever Medusa is in", async () => {
    // Medusa in French, our screens in English.
    expect(menuLabel()).toBe("Statistics")

    setLang("es")
    await settle()
    expect(i18next.language).toBe("es")
    expect(menuLabel()).toBe("Estadísticas")
    expect(i18next.t("menu.newOrder", { ns: MENU_NS })).toBe("Nuevo pedido")
    expect(i18next.t("menu.appearance", { ns: MENU_NS })).toBe("Apariencia")

    setLang("en")
    await settle()
    expect(menuLabel()).toBe("Statistics")
    expect(i18next.t("menu.newOrder", { ns: MENU_NS })).toBe("New order")
  })

  it("once a language was chosen, pulls Medusa back into it; before that, never", async () => {
    // Our screens in Spanish and Medusa in English, as on a device where the
    // account's language has just arrived.
    setLang("es")
    await settle()
    adopt.mockImplementationOnce(() => undefined)
    await i18next.changeLanguage("en")
    await settle()
    expect([getLang(), i18next.language]).toEqual(["es", "en"])

    // Nobody chose: Medusa is left in English.
    keepDashboardInStep(false)
    await settle()
    expect(i18next.language).toBe("en")

    // Español was chosen (on this device or another): Medusa follows.
    keepDashboardInStep(true)
    await settle()
    expect(i18next.language).toBe("es")
    expect(getLang()).toBe("es")

    // A language of Medusa's that reads our English is in step already.
    await i18next.changeLanguage("fr")
    await settle()
    expect(getLang()).toBe("en")
    keepDashboardInStep(true)
    await settle()
    expect(i18next.language).toBe("fr")
    keepDashboardInStep(false)
  })

  it("tells the menu to redraw even when Medusa's language stays the same", async () => {
    await i18next.changeLanguage("fr")
    await settle()
    expect(getLang()).toBe("en")

    const announced = jest.fn()
    i18next.on("languageChanged", announced)
    // Our English already matches Medusa's French; the labels still need a
    // redraw, and the announcement is what Medusa's menu listens for.
    alignDashboard()
    await settle()
    i18next.off("languageChanged", announced)

    expect(announced).toHaveBeenCalledWith("fr")
    expect(i18next.language).toBe("fr")
  })
})
