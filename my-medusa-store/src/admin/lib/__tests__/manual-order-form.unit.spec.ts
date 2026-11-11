import type { CompactProduct, CompactVariant } from "../compact"
import {
  CustomerForm,
  EMPTY_CUSTOMER,
  HONDURAS_DEPARTMENTS,
  Line,
  QUICK_PLACES,
  addVariant,
  estimateSubtotal,
  extractCartId,
  fromStoreCart,
  isBlankForm,
  isSellable,
  maxQuantity,
  parseDraft,
  setQuantity,
  splitFullName,
  toCartInput,
  unitCount,
  validateOrderForm,
} from "../manual-order-form"
import type { StoreCartPrefill } from "../manual-orders"
import {
  formatAgo,
  fulfillmentLabel,
  paymentLabel,
  paymentMethodName,
  summarizeItems,
} from "../orders-format"
import { LOW_STOCK, priceRange, stockLevel, totalAvailable } from "../products-format"

const variant = (overrides: Partial<CompactVariant> = {}): CompactVariant => ({
  id: "v_m",
  title: "M",
  sku: "CG-M",
  price: 450,
  available: 5,
  allow_backorder: false,
  stock: null,
  ...overrides,
})

const product: Pick<CompactProduct, "title" | "thumbnail"> = {
  title: "Camiseta Gótica",
  thumbnail: "https://example.com/a.png",
}

const customer: CustomerForm = {
  full_name: "María López Zelaya",
  phone: "9876-5432",
  email: "",
  city: "Tegucigalpa",
  province: "Francisco Morazán",
  address_1: "Col. Kennedy, bloque 3",
  address_2: "Frente a la pulpería",
  company: "",
  country_code: "hn",
}

describe("lines", () => {
  it("adds a size as a line, and one more unit when tapped again", () => {
    let lines = addVariant([], product, variant())
    expect(lines).toEqual([
      {
        variant_id: "v_m",
        quantity: 1,
        title: "Camiseta Gótica",
        variant_title: "M",
        thumbnail: "https://example.com/a.png",
        price: 450,
        available: 5,
        allow_backorder: false,
      },
    ])
    lines = addVariant(lines, product, variant())
    lines = addVariant(lines, product, variant({ id: "v_l", title: "L" }))
    expect(lines.map((line) => [line.variant_id, line.quantity])).toEqual([
      ["v_m", 2],
      ["v_l", 1],
    ])
  })

  it("never adds past what is left", () => {
    let lines: Line[] = []
    for (let i = 0; i < 5; i++) {
      lines = addVariant(lines, product, variant({ available: 2 }))
    }
    expect(lines[0].quantity).toBe(2)
  })

  it("takes the picker's fresher price and stock when adding to a line", () => {
    const stale = addVariant([], product, variant({ price: 400, available: 9 }))
    const fresh = addVariant(stale, product, variant({ price: 450, available: 3 }))
    expect(fresh[0]).toMatchObject({ quantity: 2, price: 450, available: 3 })
  })

  it("caps quantities, and removes the line at zero", () => {
    const lines = addVariant([], product, variant())
    expect(setQuantity(lines, "v_m", 3)[0].quantity).toBe(3)
    expect(setQuantity(lines, "v_m", 500)[0].quantity).toBe(99)
    expect(setQuantity(lines, "v_m", 0)).toEqual([])
    expect(setQuantity(lines, "v_m", -1)).toEqual([])
    expect(setQuantity(lines, "otra", 4)).toEqual(lines)
  })

  it("knows how many of a line can be asked for", () => {
    expect(maxQuantity({ available: 3, allow_backorder: false })).toBe(3)
    expect(maxQuantity({ available: 0, allow_backorder: false })).toBe(0)
    expect(maxQuantity({ available: 0, allow_backorder: true })).toBe(99)
    // Stock not tracked: it never runs out.
    expect(maxQuantity({ available: null, allow_backorder: false })).toBe(99)
    expect(maxQuantity({ available: 500, allow_backorder: false })).toBe(99)
  })

  it("only offers sizes that can be sold", () => {
    expect(isSellable(variant())).toBe(true)
    expect(isSellable(variant({ available: 0 }))).toBe(false)
    expect(isSellable(variant({ available: 0, allow_backorder: true }))).toBe(true)
    expect(isSellable(variant({ available: null }))).toBe(true)
    expect(isSellable(variant({ price: null }))).toBe(false)
  })

  it("counts units and estimates the products' total", () => {
    const lines = [
      ...addVariant([], product, variant()),
      { ...addVariant([], product, variant({ id: "v_l", price: 333.33 }))[0], quantity: 3 },
      { ...addVariant([], product, variant({ id: "v_x", price: null }))[0], quantity: 2 },
    ]
    expect(unitCount(lines)).toBe(6)
    expect(estimateSubtotal(lines)).toBe(1449.99)
    expect(unitCount([])).toBe(0)
    expect(estimateSubtotal([])).toBe(0)
  })
})

describe("splitFullName", () => {
  it("takes the first word as the name and the rest as surnames, like the storefront", () => {
    expect(splitFullName("María López Zelaya")).toEqual({ first_name: "María", last_name: "López Zelaya" })
    expect(splitFullName("  Kevin   Ordóñez ")).toEqual({ first_name: "Kevin", last_name: "Ordóñez" })
    expect(splitFullName("Ana")).toEqual({ first_name: "Ana", last_name: "" })
    expect(splitFullName("")).toEqual({ first_name: "", last_name: "" })
  })
})

describe("validateOrderForm", () => {
  const lines = addVariant([], product, variant())

  it("passes a complete form", () => {
    expect(validateOrderForm(lines, customer)).toEqual([])
    expect(validateOrderForm(lines, { ...customer, email: "maria@example.com" })).toEqual([])
  })

  it("lists everything missing from an empty one, products first", () => {
    expect(validateOrderForm([], EMPTY_CUSTOMER).map((error) => error.field)).toEqual([
      "items",
      "full_name",
      "phone",
      "city",
      "province",
      "address_1",
    ])
  })

  it("tells a missing phone from an incomplete one", () => {
    const message = (phone: string) =>
      validateOrderForm(lines, { ...customer, phone }).find((e) => e.field === "phone")?.message
    expect(message("")).toBe("Falta el teléfono del cliente.")
    expect(message("987")).toBe("Revisá el teléfono: no parece un número completo.")
    expect(message("+1 305 555 1234")).toBeUndefined()
  })

  it("refuses more units than there are, by name", () => {
    const over = [{ ...lines[0], quantity: 6 }]
    expect(validateOrderForm(over, customer)).toEqual([
      { field: "items", message: "Solo quedan 5 de Camiseta Gótica (M)." },
    ])
    expect(validateOrderForm([{ ...lines[0], quantity: 2, available: 1 }], customer)[0].message).toBe(
      "Solo queda 1 de Camiseta Gótica (M)."
    )
    expect(validateOrderForm([{ ...lines[0], available: 0 }], customer)[0].message).toBe(
      "Camiseta Gótica (M) está agotado."
    )
  })

  it("checks an email only when one was typed", () => {
    expect(validateOrderForm(lines, { ...customer, email: "no-es-correo" })).toEqual([
      { field: "email", message: "El correo no parece válido." },
    ])
    expect(validateOrderForm(lines, { ...customer, email: "   " })).toEqual([])
  })
})

describe("toCartInput", () => {
  const lines = [{ ...addVariant([], product, variant())[0], quantity: 2 }]

  it("builds the request for an order made from scratch", () => {
    expect(toCartInput(lines, { ...customer, phone: " 9876-5432 " })).toEqual({
      items: [{ variant_id: "v_m", quantity: 2 }],
      email: null,
      shipping_address: {
        first_name: "María",
        last_name: "López Zelaya",
        phone: "9876-5432",
        address_1: "Col. Kennedy, bloque 3",
        address_2: "Frente a la pulpería",
        company: "",
        city: "Tegucigalpa",
        province: "Francisco Morazán",
        country_code: "hn",
      },
      shipping_option_id: null,
      replace_cart_id: null,
    })
  })

  it("carries the store cart's id, discounts and shipping choice", () => {
    const source = {
      source_cart_id: "cart_01M75774EJ4BD7FA3QV6J60601",
      promo_codes: ["BIENVENIDA"],
      shipping_option_id: "so_tegus",
    } as StoreCartPrefill
    expect(toCartInput(lines, { ...customer, email: "m@example.com" }, { source, replaceCartId: "cart_old" })).toMatchObject({
      email: "m@example.com",
      source_cart_id: "cart_01M75774EJ4BD7FA3QV6J60601",
      promo_codes: ["BIENVENIDA"],
      shipping_option_id: "so_tegus",
      replace_cart_id: "cart_old",
    })
  })
})

describe("fromStoreCart", () => {
  const cart: StoreCartPrefill = {
    source_cart_id: "cart_01M75774EJ4BD7FA3QV6J60601",
    email: "maria@example.com",
    currency_code: "hnl",
    items: [
      { id: "cali_1", variant_id: "v_m", product_id: "p", title: "Camiseta Gótica", variant_title: "M", thumbnail: null, quantity: 2, unit_price: 450, total: 900 },
      // A line whose variant was deleted cannot be ordered again.
      { id: "cali_2", variant_id: null, product_id: null, title: "Descontinuado", variant_title: null, thumbnail: null, quantity: 1, unit_price: 100, total: 100 },
    ],
    shipping_address: {
      full_name: "María López Zelaya",
      first_name: "María",
      last_name: "López Zelaya",
      phone: "9876-5432",
      address_1: "Col. Kennedy",
      address_2: "",
      company: "",
      city: "Tegucigalpa",
      province: "Francisco Morazán",
      country_code: "hn",
    },
    shipping_option_id: "so_tegus",
    promo_codes: [],
    total: 980,
    placed: null,
    completed: false,
  }

  it("fills the form from what the customer built", () => {
    const { lines, customer: filled } = fromStoreCart(cart)
    expect(lines).toEqual([
      { variant_id: "v_m", quantity: 2, title: "Camiseta Gótica", variant_title: "M", thumbnail: null, price: 450, available: null, allow_backorder: false },
    ])
    expect(filled).toMatchObject({
      full_name: "María López Zelaya",
      phone: "9876-5432",
      email: "maria@example.com",
      city: "Tegucigalpa",
      province: "Francisco Morazán",
      country_code: "hn",
    })
    expect(validateOrderForm(lines, filled)).toEqual([])
  })

  it("starts an empty customer for a cart with no address", () => {
    expect(fromStoreCart({ ...cart, shipping_address: null, email: null }).customer).toEqual(EMPTY_CUSTOMER)
  })
})

describe("draft", () => {
  const lines = addVariant([], product, variant())

  it("knows an untouched form from one with something in it", () => {
    expect(isBlankForm([], EMPTY_CUSTOMER, null)).toBe(true)
    expect(isBlankForm([], { ...EMPTY_CUSTOMER, full_name: "   " }, null)).toBe(true)
    expect(isBlankForm(lines, EMPTY_CUSTOMER, null)).toBe(false)
    expect(isBlankForm([], { ...EMPTY_CUSTOMER, phone: "9" }, null)).toBe(false)
    expect(isBlankForm([], EMPTY_CUSTOMER, { source_cart_id: "cart_1" } as StoreCartPrefill)).toBe(false)
  })

  it("comes back exactly as it was kept", () => {
    const source = { source_cart_id: "cart_01M75774EJ4BD7FA3QV6J60601", promo_codes: [] } as unknown as StoreCartPrefill
    const kept = { lines, customer, source, currency: "hnl" }
    expect(parseDraft(JSON.stringify(kept))).toEqual(kept)
    expect(parseDraft(JSON.stringify({ lines, customer }))).toEqual({
      lines,
      customer,
      source: null,
      currency: "hnl",
    })
  })

  it("drops what a newer version would not understand, keeping the rest", () => {
    const draft = parseDraft(
      JSON.stringify({
        lines: [lines[0], null, { variant_id: "v", quantity: 0, title: "x" }, { quantity: 1 }],
        customer: { full_name: "Ana", phone: 99887766, extra: "no" },
        source: { id: "sin el campo que hace falta" },
      })
    )
    expect(draft?.lines).toEqual([lines[0]])
    expect(draft?.customer).toEqual({ ...EMPTY_CUSTOMER, full_name: "Ana" })
    expect(draft?.source).toBeNull()
  })

  it("is nothing when there is nothing usable stored", () => {
    for (const raw of [null, undefined, "", "no es json", "null", "42", "{}", '{"lines":"x","customer":{}}', '{"lines":[]}']) {
      expect(parseDraft(raw)).toBeNull()
    }
  })
})

describe("places", () => {
  it("offers the eighteen departments and the two contra entrega cities", () => {
    expect(HONDURAS_DEPARTMENTS).toHaveLength(18)
    expect(new Set(HONDURAS_DEPARTMENTS).size).toBe(18)
    for (const place of QUICK_PLACES) {
      expect(HONDURAS_DEPARTMENTS).toContain(place.province)
    }
  })
})

describe("extractCartId (browser copy)", () => {
  it("agrees with the server's rule", () => {
    expect(extractCartId("Pedido #: cart_01M75774EJ4BD7FA3QV6J60601")).toBe("cart_01M75774EJ4BD7FA3QV6J60601")
    expect(extractCartId("cart_01M75774EJ4BD7FA3QV6J60601X")).toBeNull()
    expect(extractCartId("sin carrito")).toBeNull()
  })
})

describe("order words", () => {
  it("names payment states the way the owner thinks of them", () => {
    expect(paymentLabel("authorized")).toEqual({ label: "Por cobrar", tone: "orange" })
    expect(paymentLabel("captured")).toEqual({ label: "Cobrado", tone: "green" })
    expect(paymentLabel("not_paid").tone).toBe("red")
    expect(paymentLabel("algo_nuevo")).toEqual({ label: "algo_nuevo", tone: "grey" })
  })

  it("names fulfillment states", () => {
    expect(fulfillmentLabel("not_fulfilled")).toEqual({ label: "Por despachar", tone: "red" })
    expect(fulfillmentLabel("shipped").label).toBe("Enviado")
    expect(fulfillmentLabel("delivered")).toEqual({ label: "Entregado", tone: "green" })
    expect(fulfillmentLabel("x").tone).toBe("grey")
  })

  it("names the ways of paying", () => {
    expect(paymentMethodName("pp_contra-entrega_contra-entrega")).toBe("Contra entrega")
    expect(paymentMethodName("pp_transferencia-bac_transferencia-bac")).toBe("Transferencia BAC")
    expect(paymentMethodName("pp_system_default")).toBe("Pago manual")
    expect(paymentMethodName("pp_otro")).toBeNull()
    expect(paymentMethodName(null)).toBeNull()
  })

  it("says how long ago, and past a week just the date", () => {
    const now = Date.parse("2026-11-11T18:00:00Z")
    const ago = (ms: number) => formatAgo(new Date(now - ms).toISOString(), now)
    expect(ago(10_000)).toBe("ahora")
    expect(ago(5 * 60_000)).toBe("hace 5 minutos")
    expect(ago(60 * 60_000)).toBe("hace 1 hora")
    expect(ago(3 * 3600_000)).toBe("hace 3 horas")
    expect(ago(26 * 3600_000)).toBe("ayer")
    expect(ago(3 * 86400_000)).toBe("hace 3 días")
    expect(ago(20 * 86400_000)).toMatch(/^22 oct/)
    expect(ago(400 * 86400_000)).toMatch(/2025$/)
    expect(formatAgo("no es una fecha", now)).toBe("")
  })

  it("puts an order's lines in one sentence", () => {
    const items = [
      { title: "Camiseta", variant_title: "M", quantity: 2 },
      { title: "Hoodie", variant_title: null, quantity: 1 },
    ]
    expect(summarizeItems(items, 3)).toBe("2× Camiseta (M), 1× Hoodie")
    expect(summarizeItems(items, 7)).toBe("2× Camiseta (M), 1× Hoodie y 4 más")
    expect(summarizeItems([], 0)).toBe("")
  })
})

describe("product words", () => {
  const withVariants = (variants: Partial<CompactVariant>[]) => ({
    variants: variants.map((v) => variant(v)),
  })

  it("shows one price, or the range when sizes are priced apart", () => {
    // Intl puts a no-break space between "L" and the amount.
    const range = (variants: Partial<CompactVariant>[]) =>
      priceRange(withVariants(variants), "hnl").replace(/ /g, " ")
    expect(range([{ price: 450 }, { price: 450 }])).toBe("L 450.00")
    expect(range([{ price: 520 }, { price: 450 }, { price: null }])).toBe("L 450.00 – L 520.00")
    expect(range([{ price: null }])).toBe("Sin precio")
    expect(priceRange({ variants: [] }, "hnl")).toBe("Sin precio")
  })

  it("adds up what is left across the tracked sizes", () => {
    expect(totalAvailable(withVariants([{ available: 5 }, { available: 0 }, { available: null }]))).toBe(5)
    expect(totalAvailable(withVariants([{ available: null }]))).toBeNull()
    expect(totalAvailable({ variants: [] })).toBeNull()
  })

  it("grades a size's stock", () => {
    expect(stockLevel(null)).toBe("untracked")
    expect(stockLevel(0)).toBe("out")
    expect(stockLevel(-1)).toBe("out")
    expect(stockLevel(1)).toBe("low")
    expect(stockLevel(LOW_STOCK)).toBe("low")
    expect(stockLevel(LOW_STOCK + 1)).toBe("ok")
  })
})
