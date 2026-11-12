import { DICTS } from "../../i18n/dictionary"
import { LANGS, setLang } from "../../i18n/lang"
import {
  MESSAGE_TEMPLATES,
  MessageOrder,
  toWhatsappNumber,
  whatsappUrl,
} from "../whatsapp"

const digitsOf = (raw: string, country?: string | null) =>
  toWhatsappNumber(raw, country)?.digits ?? null

describe("toWhatsappNumber", () => {
  it("reads a Honduran number however it was typed", () => {
    for (const typed of [
      "98765432",
      "9876-5432",
      "9876 5432",
      " 9876.5432 ",
      "(504) 9876-5432",
      "504 9876 5432",
      "50498765432",
      "+504 9876-5432",
      "+50498765432",
      "0050498765432",
      "00 504 9876 5432",
      "Tel: 9876-5432",
    ]) {
      expect(digitsOf(typed, "hn")).toBe("50498765432")
    }
  })

  it("shows it the way people write it", () => {
    expect(toWhatsappNumber("98765432", "hn")).toEqual({
      digits: "50498765432",
      display: "+504 9876-5432",
      certain: true,
    })
    expect(toWhatsappNumber("+1 (305) 555-1234", "hn")?.display).toBe(
      "+1 305 555 1234"
    )
  })

  it("assumes Honduras when the address says nothing", () => {
    expect(toWhatsappNumber("33445566", null)).toEqual({
      digits: "50433445566",
      display: "+504 3344-5566",
      certain: true,
    })
    expect(digitsOf("33445566", undefined)).toBe("50433445566")
    expect(digitsOf("33445566", "")).toBe("50433445566")
  })

  it("takes a number that says where it is from at its word", () => {
    // A Honduran address, a number from abroad.
    expect(toWhatsappNumber("+1 305 555 1234", "hn")).toMatchObject({
      digits: "13055551234",
      certain: true,
    })
    expect(digitsOf("+34 612 345 678", "hn")).toBe("34612345678")
    expect(digitsOf("0034612345678", "hn")).toBe("34612345678")
    expect(digitsOf("+52 55 1234 5678", "hn")).toBe("525512345678")
    // A country the table does not know still works: the "+" is enough.
    expect(toWhatsappNumber("+81 90 1234 5678", "hn")).toMatchObject({
      digits: "819012345678",
      certain: true,
    })
  })

  it("adds the code of the address's country to a national number", () => {
    expect(digitsOf("305 555 1234", "us")).toBe("13055551234")
    expect(digitsOf("1 305 555 1234", "us")).toBe("13055551234")
    expect(digitsOf("5512345678", "mx")).toBe("525512345678")
    expect(digitsOf("612 345 678", "es")).toBe("34612345678")
    expect(digitsOf("7777-8888", "sv")).toBe("50377778888")
    expect(digitsOf("5555 1234", "gt")).toBe("50255551234")
    // The trunk zero dialed inside the country is not part of it.
    expect(digitsOf("07700 900123", "gb")).toBe("447700900123")
    expect(digitsOf("0991234567", "ec")).toBe("593991234567")
  })

  it("recognises a full foreign number typed without the plus", () => {
    expect(toWhatsappNumber("13055551234", "hn")).toMatchObject({
      digits: "13055551234",
      certain: true,
    })
    expect(digitsOf("50377778888", "hn")).toBe("50377778888")
  })

  it("guesses, and says so, when the country cannot be known", () => {
    // Eight digits on a foreign address: probably still Honduran.
    expect(toWhatsappNumber("98765432", "us")).toEqual({
      digits: "50498765432",
      display: "+504 9876-5432",
      certain: false,
    })
    // Ten digits on a Honduran address: probably a US number.
    expect(toWhatsappNumber("3055551234", "hn")).toMatchObject({
      digits: "13055551234",
      certain: false,
    })
    // Long, with no known code in front.
    expect(toWhatsappNumber("999123456789", "hn")).toMatchObject({
      digits: "999123456789",
      certain: false,
    })
  })

  it("uses the first number when two were typed", () => {
    expect(digitsOf("9876-5432 / 3344-5566", "hn")).toBe("50498765432")
    expect(digitsOf("98765432, 33445566", "hn")).toBe("50498765432")
    expect(digitsOf("9876 5432 o 3344 5566", "hn")).toBe("50498765432")
  })

  it("drops an extension", () => {
    expect(digitsOf("2233-4455 ext. 12", "hn")).toBe("50422334455")
    expect(digitsOf("2233-4455 x12", "hn")).toBe("50422334455")
  })

  it("gives up on what is not a phone number", () => {
    for (const typed of ["", "   ", "sin teléfono", "123", "12345", "+12", "123456789012345678"]) {
      expect(toWhatsappNumber(typed, "hn")).toBeNull()
    }
    expect(toWhatsappNumber(null, "hn")).toBeNull()
    expect(toWhatsappNumber(undefined)).toBeNull()
    // Nine digits fit no plan the store deals with.
    expect(toWhatsappNumber("987654321", "hn")).toBeNull()
  })

  it("never returns anything but digits to dial", () => {
    for (const typed of ["+504 9876-5432", "(305) 555-1234", "0034 612 345 678"]) {
      expect(toWhatsappNumber(typed, "us")?.digits).toMatch(/^\d{8,15}$/)
    }
  })
})

describe("whatsappUrl", () => {
  it("opens the chat, with or without a message", () => {
    expect(whatsappUrl("50498765432")).toBe("https://wa.me/50498765432")
    expect(whatsappUrl("50498765432", "Hola María, ¿todo bien?\nGracias")).toBe(
      "https://wa.me/50498765432?text=Hola%20Mar%C3%ADa%2C%20%C2%BFtodo%20bien%3F%0AGracias"
    )
  })
})

describe("message templates", () => {
  const order: MessageOrder = {
    display_id: 128,
    first_name: "María",
    total: "L 1,880.00",
    collect_total: "L 1,974.00",
    items: [
      { title: "Camiseta Gótica", variant_title: "M", quantity: 2 },
      { title: "Hoodie Abismo", variant_title: null, quantity: 1 },
    ],
    address: "Col. Kennedy, bloque 3, Tegucigalpa, Francisco Morazán",
  }
  const build = (id: string, o: MessageOrder = order) =>
    MESSAGE_TEMPLATES.find((template) => template.id === id)!.build(o, "Y2K Fit")

  it("greet by name and name the order", () => {
    expect(build("saludo")).toBe(
      "Hola María, te escribimos de Y2K Fit por tu pedido #128."
    )
  })

  it("confirm with the products, the cash to collect and the address", () => {
    const text = build("confirmar")
    expect(text).toContain("2× Camiseta Gótica (M)\n1× Hoodie Abismo")
    expect(text).toContain("Total a pagar al recibir: L 1,974.00")
    expect(text).not.toContain("L 1,880.00")
    expect(text).toContain("Entrega: Col. Kennedy, bloque 3, Tegucigalpa, Francisco Morazán")
    expect(text.endsWith("¿Está todo correcto?")).toBe(true)
  })

  it("use the order total when it is not contra entrega", () => {
    const transfer = { ...order, collect_total: null }
    expect(build("confirmar", transfer)).toContain("Total: L 1,880.00")
    expect(build("en-camino", transfer)).toBe(
      "Hola María, tu pedido #128 de Y2K Fit ya va en camino."
    )
    expect(build("en-camino")).toContain("Tené listos L 1,974.00 para pagar al recibir.")
  })

  it("still read well with no name, no number and no address", () => {
    const bare: MessageOrder = { ...order, display_id: null, first_name: "", address: "" }
    expect(build("saludo", bare)).toBe("Hola, te escribimos de Y2K Fit por tu pedido.")
    expect(build("confirmar", bare)).not.toContain("Entrega:")
    expect(build("confirmar", bare)).not.toMatch(/\n{3,}/)
  })

  it("all produce text, and each has its own name in both languages", () => {
    expect(new Set(MESSAGE_TEMPLATES.map((t) => t.id)).size).toBe(MESSAGE_TEMPLATES.length)
    for (const lang of LANGS) {
      const names = DICTS[lang].orders.whatsapp.templates
      expect(Object.keys(names).sort()).toEqual(MESSAGE_TEMPLATES.map((t) => t.id).sort())
      expect(new Set(Object.values(names).map((name) => name.label)).size).toBe(
        MESSAGE_TEMPLATES.length
      )
    }
    for (const template of MESSAGE_TEMPLATES) {
      expect(template.build(order, "Y2K Fit").length).toBeGreaterThan(20)
    }
  })

  it("are written to the customer in Spanish whatever the panel's language", () => {
    setLang("en")
    try {
      expect(build("saludo")).toBe("Hola María, te escribimos de Y2K Fit por tu pedido #128.")
    } finally {
      setLang("es")
    }
  })
})
