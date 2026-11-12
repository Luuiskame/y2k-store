import i18next from "i18next"

import { keepDashboardInStep, startDashboardLanguage } from "../dashboard"
import { getLang, setLang } from "../lang"

/**
 * The panel loading on a device where the owner's choice of language arrives
 * before Medusa has started: the saved preferences are applied first (they
 * are in localStorage), Medusa's i18next starts later, in whatever language
 * that browser had.
 *
 * In a file of its own because i18next can only start once per file, and the
 * other tests of the bridge start it with nothing chosen.
 */
describe("a panel that loads with a language already chosen", () => {
  it("brings Medusa into it as soon as Medusa starts", async () => {
    const adopt = jest.fn()

    // What theme/boot.ts does, in its order.
    setLang("es")
    keepDashboardInStep(true)
    startDashboardLanguage(adopt)

    // Medusa on this device was never told anything: it starts in English.
    await i18next.init({
      lng: "en",
      fallbackLng: "en",
      resources: {
        en: { translation: { orders: "Orders" } },
        es: { translation: { orders: "Pedidos" } },
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(i18next.language).toBe("es")
    expect(i18next.t("orders")).toBe("Pedidos")
    // Our language was the one chosen: it is not Medusa's start that wins.
    expect(getLang()).toBe("es")
    expect(adopt).not.toHaveBeenCalled()
  })
})
