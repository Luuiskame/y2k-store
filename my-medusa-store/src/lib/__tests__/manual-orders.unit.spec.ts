import { PaymentSessionStatus } from "@medusajs/framework/utils"

import {
  CompactProductsQuerySchema,
  CompactOrdersQuerySchema,
} from "../../api/admin/compact/validators"
import {
  CompleteManualOrderSchema,
  CreateManualOrderCartSchema,
  StoreCartsQuerySchema,
} from "../../api/admin/manual-orders/validators"
import ContraEntregaProviderService from "../../modules/contra-entrega/service"
import { orderMatchesView, toCompactOrder, toCompactProduct } from "../compact"
import {
  BAC_PROVIDER_ID,
  CONTRA_ENTREGA_PROVIDER_ID,
  buildContraEntregaMetadata,
  contraEntregaCollectTotal,
  contraEntregaSurcharge,
  isContraEntregaProvider,
} from "../contra-entrega"
import {
  CART_TOTALS_FIELDS,
  MANUAL_ORDER_KEY,
  PAYMENT_PROVIDER_BY_METHOD,
  SOURCE_CART_PLACED_KEY,
  carryOverMetadata,
  cartMatches,
  compareVariants,
  completionBlocker,
  extractCartId,
  isOfferableCart,
  mergeItems,
  normalizeAddress,
  phoneDigits,
  readManualOrderMetadata,
  readSourceCartPlacedMark,
  spanishWorkflowError,
  toShippingOptionView,
  toStoreCartCard,
  toStoreCartPrefill,
  toWorkingCartSummary,
  waitingFirst,
} from "../manual-orders"

const CART_ID = "cart_01M75774EJ4BD7FA3QV6J60601"

const address = {
  first_name: "María",
  last_name: "López Zelaya",
  phone: "9876-5432",
  address_1: "Col. Kennedy, bloque 3",
  address_2: "Frente a la pulpería",
  company: "Portón negro",
  city: "Tegucigalpa",
  province: "Francisco Morazán",
  country_code: "hn",
}

const storeCart = (overrides: Record<string, unknown> = {}) => ({
  id: CART_ID,
  email: "maria@example.com",
  currency_code: "hnl",
  completed_at: null,
  updated_at: new Date("2026-11-11T12:00:00Z"),
  metadata: { fbp: "fb.1.2.3" },
  total: 1880,
  item_total: 1800,
  shipping_total: 80,
  discount_total: 0,
  tax_total: 0,
  items: [
    {
      id: "cali_1",
      variant_id: "variant_1",
      product_id: "prod_1",
      product_title: "Camiseta Gótica",
      title: "M",
      variant_title: "M",
      thumbnail: "https://example.com/a.png",
      quantity: 2,
      unit_price: 450,
      total: 900,
    },
    {
      id: "cali_2",
      variant_id: "variant_2",
      product_id: "prod_2",
      product_title: "Hoodie Abismo",
      variant_title: "S",
      thumbnail: null,
      quantity: 1,
      unit_price: { value: "900", precision: 20 },
    },
  ],
  shipping_address: address,
  shipping_methods: [{ shipping_option_id: "so_tegus", name: "Envío Tegucigalpa", amount: 80 }],
  promotions: [{ code: "BIENVENIDA" }, { code: null }],
  ...overrides,
})

describe("contra entrega", () => {
  it("charges the delivery company's 5%, rounded to cents like the storefront", () => {
    expect(contraEntregaSurcharge(1880)).toBe(94)
    expect(contraEntregaSurcharge(1950)).toBe(97.5)
    expect(contraEntregaSurcharge(333.33)).toBe(16.67)
    expect(contraEntregaSurcharge(0)).toBe(0)
    expect(contraEntregaSurcharge(null)).toBe(0)
    expect(contraEntregaSurcharge(undefined)).toBe(0)
  })

  it("adds it to what the courier collects, unless it is waived", () => {
    expect(contraEntregaCollectTotal(1880, true)).toBe(1974)
    expect(contraEntregaCollectTotal(1880, false)).toBe(1880)
    // No float dust: 0.1 + 0.2 style sums come out as money.
    expect(contraEntregaCollectTotal(1105.1, true)).toBe(1160.36)
  })

  it("describes itself on the order", () => {
    expect(buildContraEntregaMetadata(1880, true)).toEqual({
      surcharge_rate: 0.05,
      surcharge: 94,
      collect_total: 1974,
    })
    expect(buildContraEntregaMetadata(980, false)).toEqual({
      surcharge_rate: 0,
      surcharge: 0,
      collect_total: 980,
    })
  })

  it("is told apart from the other payment methods by its provider", () => {
    expect(isContraEntregaProvider(CONTRA_ENTREGA_PROVIDER_ID)).toBe(true)
    expect(isContraEntregaProvider(BAC_PROVIDER_ID)).toBe(false)
    expect(isContraEntregaProvider("pp_system_default")).toBe(false)
    expect(isContraEntregaProvider(null)).toBe(false)
    expect(PAYMENT_PROVIDER_BY_METHOD).toEqual({
      contra_entrega: CONTRA_ENTREGA_PROVIDER_ID,
      transferencia_bac: BAC_PROVIDER_ID,
    })
  })

  describe("payment provider", () => {
    const provider = new ContraEntregaProviderService({}, {})

    it("registers under the id the rest of the code looks for", () => {
      // Medusa builds the id as pp_<identifier>_<id in medusa-config.ts>.
      expect(`pp_${ContraEntregaProviderService.identifier}_contra-entrega`).toBe(
        CONTRA_ENTREGA_PROVIDER_ID
      )
    })

    it("authorizes on placing the order and never claims the money early", async () => {
      const session = await provider.initiatePayment({} as any)
      expect(session.id).toMatch(/^cod_\d+$/)
      expect(session.data).toEqual({ status: "pending" })

      const authorized = await provider.authorizePayment({ data: session.data } as any)
      expect(authorized.status).toBe(PaymentSessionStatus.AUTHORIZED)
      expect((await provider.getPaymentStatus({ data: session.data } as any)).status).toBe(
        PaymentSessionStatus.AUTHORIZED
      )
    })

    it("is collected when the owner captures it, and says when", async () => {
      const captured = await provider.capturePayment({ data: { status: "pending" } } as any)
      expect(captured.data).toMatchObject({ status: "collected" })
      expect(Date.parse((captured.data as any).collected_at)).not.toBeNaN()
      expect((await provider.getPaymentStatus({ data: captured.data } as any)).status).toBe(
        PaymentSessionStatus.CAPTURED
      )
    })

    it("can be canceled, and has no webhooks", async () => {
      const canceled = await provider.cancelPayment({ data: { status: "pending" } } as any)
      expect((await provider.getPaymentStatus({ data: canceled.data } as any)).status).toBe(
        PaymentSessionStatus.CANCELED
      )
      expect(await provider.getWebhookActionAndData({} as any)).toEqual({
        action: "not_supported",
      })
    })
  })
})

describe("extractCartId", () => {
  it("finds the cart in the storefront's WhatsApp message", () => {
    const message = `Hola, quiero coordinar pago contra entrega\n\nMi pedido:\n2× Camiseta — Talla M\n\nTotal a pagar: L 1,974.00\n\nPedido #: ${CART_ID}`
    expect(extractCartId(message)).toBe(CART_ID)
    expect(extractCartId(CART_ID)).toBe(CART_ID)
    expect(extractCartId(`  ${CART_ID}.`)).toBe(CART_ID)
  })

  it("ignores text with no cart in it", () => {
    expect(extractCartId("Hola, ¿tienen talla M?")).toBeNull()
    expect(extractCartId("order_01M75774EJ4BD7FA3QV6J60601")).toBeNull()
    expect(extractCartId("cart_corto")).toBeNull()
    // One character too many is some other id, not a cart.
    expect(extractCartId(`${CART_ID}X`)).toBeNull()
    expect(extractCartId("")).toBeNull()
    expect(extractCartId(null)).toBeNull()
  })
})

describe("addresses and items", () => {
  it("stores an address the way the storefront's checkout does", () => {
    expect(
      normalizeAddress({
        first_name: "  Carlos ",
        last_name: null,
        phone: " +504 3344  5566 ",
        address_1: "Barrio  Guamilito,\n3 calle",
        city: "San Pedro Sula",
        province: "Cortés",
        country_code: "HN",
      })
    ).toEqual({
      first_name: "Carlos",
      last_name: "",
      phone: "+504 3344 5566",
      address_1: "Barrio Guamilito, 3 calle",
      address_2: "",
      company: "",
      city: "San Pedro Sula",
      province: "Cortés",
      postal_code: "00000",
      country_code: "hn",
    })
  })

  it("keeps a postal code that was given", () => {
    expect(normalizeAddress({ ...address, postal_code: "11101" }).postal_code).toBe("11101")
  })

  it("makes one line per variant", () => {
    expect(
      mergeItems([
        { variant_id: "a", quantity: 1 },
        { variant_id: "b", quantity: 2 },
        { variant_id: "a", quantity: 2 },
      ])
    ).toEqual([
      { variant_id: "a", quantity: 3 },
      { variant_id: "b", quantity: 2 },
    ])
    expect(mergeItems([])).toEqual([])
  })

  it("reads a phone as its last eight digits", () => {
    expect(phoneDigits("+504 9876-5432")).toBe("98765432")
    expect(phoneDigits("9876 5432")).toBe("98765432")
    expect(phoneDigits("")).toBe("")
    expect(phoneDigits(null)).toBe("")
  })
})

describe("compareVariants", () => {
  const sorted = (titles: string[]) =>
    titles.map((title) => ({ title })).sort(compareVariants).map((v) => v.title)

  it("puts clothing sizes in the order people read them", () => {
    expect(sorted(["XL", "S", "2XL", "M", "XS", "L"])).toEqual(["XS", "S", "M", "L", "XL", "2XL"])
    expect(sorted(["m", "s", "l"])).toEqual(["s", "m", "l"])
  })

  it("groups a size with its colors", () => {
    expect(sorted(["M / White", "XL / Black", "S / White", "M / Black", "S / Black"])).toEqual([
      "S / Black",
      "S / White",
      "M / Black",
      "M / White",
      "XL / Black",
    ])
  })

  it("sorts numbers as numbers and leaves non-sizes for last", () => {
    expect(sorted(["Talla 10", "Talla 8", "Talla 12"])).toEqual(["Talla 8", "Talla 10", "Talla 12"])
    expect(sorted(["Único", "M", "Azul"])).toEqual(["M", "Azul", "Único"])
  })

  it("lets the rank set in the admin win", () => {
    const variants = [
      { title: "S", variant_rank: 2 },
      { title: "XL", variant_rank: 0 },
      { title: "M", variant_rank: 1 },
    ].sort(compareVariants)
    expect(variants.map((v) => v.title)).toEqual(["XL", "M", "S"])
  })
})

describe("cart metadata", () => {
  const own = { created_by: "user_1", source: "store_cart", source_cart_id: CART_ID }

  it("recognises a working cart by its marker", () => {
    expect(readManualOrderMetadata({ [MANUAL_ORDER_KEY]: own })).toEqual(own)
    expect(readManualOrderMetadata({ [MANUAL_ORDER_KEY]: { created_by: "u", source: "manual" } })).toEqual({
      created_by: "u",
      source: "manual",
    })
  })

  it("does not mistake anything else for one", () => {
    expect(readManualOrderMetadata(null)).toBeNull()
    expect(readManualOrderMetadata({})).toBeNull()
    expect(readManualOrderMetadata({ [MANUAL_ORDER_KEY]: true })).toBeNull()
    expect(readManualOrderMetadata({ [MANUAL_ORDER_KEY]: { source: "manual" } })).toBeNull()
    expect(readManualOrderMetadata({ [MANUAL_ORDER_KEY]: { created_by: "u", source: "otra" } })).toBeNull()
  })

  it("reads the order noted on a customer's cart", () => {
    expect(
      readSourceCartPlacedMark({
        [SOURCE_CART_PLACED_KEY]: { order_id: "order_1", display_id: 12, at: "2026-11-11T12:00:00Z" },
      })
    ).toEqual({ order_id: "order_1", display_id: 12, at: "2026-11-11T12:00:00Z" })
    expect(readSourceCartPlacedMark({ [SOURCE_CART_PLACED_KEY]: { order_id: "order_1" } })).toEqual({
      order_id: "order_1",
      display_id: null,
      at: "",
    })
    expect(readSourceCartPlacedMark({ [SOURCE_CART_PLACED_KEY]: "" })).toBeNull()
    expect(readSourceCartPlacedMark(undefined)).toBeNull()
  })

  it("copies a customer's metadata without the keys this feature owns", () => {
    expect(
      carryOverMetadata({
        fbp: "fb.1.2.3",
        [MANUAL_ORDER_KEY]: own,
        [SOURCE_CART_PLACED_KEY]: { order_id: "order_1" },
        contra_entrega: { surcharge: 1 },
      })
    ).toEqual({ fbp: "fb.1.2.3" })
    expect(carryOverMetadata(null)).toEqual({})
  })
})

describe("store carts", () => {
  it("offers a cart with products and a phone, and nothing else", () => {
    expect(isOfferableCart(storeCart())).toBe(true)
    expect(isOfferableCart(storeCart({ items: [] }))).toBe(false)
    expect(isOfferableCart(storeCart({ shipping_address: { ...address, phone: "" } }))).toBe(false)
    expect(isOfferableCart(storeCart({ shipping_address: null }))).toBe(false)
    expect(isOfferableCart(storeCart({ completed_at: new Date() }))).toBe(false)
    // A working cart of this feature is not a customer's cart.
    expect(
      isOfferableCart(storeCart({ metadata: { [MANUAL_ORDER_KEY]: { created_by: "u", source: "manual" } } }))
    ).toBe(false)
  })

  it("filters by name, city, email, cart id or phone digits", () => {
    const cart = storeCart()
    for (const term of ["zelaya", "MARÍA", "tegucigalpa", "maria@", CART_ID.toLowerCase(), "9876", "5432", "98765432", "  "]) {
      expect(cartMatches(cart, term)).toBe(true)
    }
    for (const term of ["carlos", "1234", "987"]) {
      expect(cartMatches(cart, term)).toBe(false)
    }
  })

  it("summarises one as a row", () => {
    expect(toStoreCartCard(storeCart())).toEqual({
      id: CART_ID,
      updated_at: "2026-11-11T12:00:00.000Z",
      customer_name: "María López Zelaya",
      phone: "9876-5432",
      email: "maria@example.com",
      city: "Tegucigalpa",
      province: "Francisco Morazán",
      currency_code: "hnl",
      item_count: 3,
      items: [
        { title: "Camiseta Gótica", variant_title: "M", quantity: 2, thumbnail: "https://example.com/a.png" },
        { title: "Hoodie Abismo", variant_title: "S", quantity: 1, thumbnail: null },
      ],
      total: 1880,
      has_shipping_method: true,
      placed: null,
    })
  })

  it("says which order already came out of it", () => {
    const placed = { order_id: "order_1", display_id: 5, at: "2026-11-11T12:00:00Z" }
    expect(toStoreCartCard(storeCart({ metadata: { [SOURCE_CART_PLACED_KEY]: placed } })).placed).toEqual(placed)
  })

  it("lists the carts still waiting before the ones already ordered", () => {
    const placed = { [SOURCE_CART_PLACED_KEY]: { order_id: "order_1", display_id: 1, at: "" } }
    const carts = [
      { id: "a", metadata: placed },
      { id: "b", metadata: null },
      { id: "c", metadata: placed },
      { id: "d", metadata: { fbp: "x" } },
    ]
    expect(waitingFirst(carts).map((cart) => cart.id)).toEqual(["b", "d", "a", "c"])
    expect(waitingFirst([])).toEqual([])
  })

  it("turns one into the form's starting point", () => {
    const prefill = toStoreCartPrefill(storeCart())
    expect(prefill).toMatchObject({
      source_cart_id: CART_ID,
      email: "maria@example.com",
      currency_code: "hnl",
      shipping_option_id: "so_tegus",
      promo_codes: ["BIENVENIDA"],
      total: 1880,
      placed: null,
      completed: false,
    })
    expect(prefill.items.map((item) => [item.variant_id, item.quantity, item.unit_price, item.total])).toEqual([
      ["variant_1", 2, 450, 900],
      // No line total given: unit price (a BigNumber here) times quantity.
      ["variant_2", 1, 900, 900],
    ])
    expect(prefill.shipping_address).toMatchObject({
      full_name: "María López Zelaya",
      phone: "9876-5432",
      province: "Francisco Morazán",
      country_code: "hn",
    })
  })

  it("copes with a cart that has no address or shipping yet", () => {
    const prefill = toStoreCartPrefill(storeCart({ shipping_address: null, shipping_methods: [], promotions: undefined, email: null }))
    expect(prefill.shipping_address).toBeNull()
    expect(prefill.shipping_option_id).toBeNull()
    expect(prefill.promo_codes).toEqual([])
    expect(prefill.email).toBeNull()
  })
})

describe("working cart summary", () => {
  const options = [
    { id: "so_nacional", name: "Envío nacional", calculated_price: { calculated_amount: 150 } },
    { id: "so_tegus", name: "Envío Tegucigalpa", amount: 80 },
  ]

  it("carries the totals, the chosen shipping and what contra entrega adds", () => {
    const summary = toWorkingCartSummary(storeCart(), options)
    expect(summary).toMatchObject({
      id: CART_ID,
      total: 1880,
      item_total: 1800,
      shipping_total: 80,
      discount_total: 0,
      shipping_method: { id: "so_tegus", name: "Envío Tegucigalpa", amount: 80 },
      promo_codes: ["BIENVENIDA"],
      contra_entrega: { surcharge: 94, collect_total: 1974 },
    })
  })

  it("lists the ways to ship cheapest first", () => {
    expect(toWorkingCartSummary(storeCart(), options).shipping_options).toEqual([
      { id: "so_tegus", name: "Envío Tegucigalpa", amount: 80 },
      { id: "so_nacional", name: "Envío nacional", amount: 150 },
    ])
    expect(toShippingOptionView({ id: "so_x" })).toEqual({ id: "so_x", name: "Envío", amount: 0 })
  })

  it("has no shipping method until one is chosen", () => {
    expect(toWorkingCartSummary(storeCart({ shipping_methods: [] }), options).shipping_method).toBeNull()
  })

  it("asks for whole lines and shipping methods, or the totals come back as zero", () => {
    // The cart module adds up the columns it loaded: "items.id" alone would
    // make every total 0 without an error (see CART_TOTALS_FIELDS).
    expect(CART_TOTALS_FIELDS).toEqual(expect.arrayContaining(["total", "items.*", "shipping_methods.*"]))
    expect(CART_TOTALS_FIELDS.some((field) => /^(items|shipping_methods)\.(?!\*|total$)/.test(field))).toBe(false)
  })
})

describe("completionBlocker", () => {
  const working = (overrides: Record<string, unknown> = {}) =>
    storeCart({ metadata: { [MANUAL_ORDER_KEY]: { created_by: "u", source: "manual" } }, ...overrides })

  it("lets a complete working cart through", () => {
    expect(completionBlocker(working())).toBeNull()
  })

  it("names what is missing, in Spanish", () => {
    expect(completionBlocker(undefined)).toMatch(/No se encontró/)
    expect(completionBlocker(storeCart())).toMatch(/no se preparó desde el panel/)
    expect(completionBlocker(working({ items: [] }))).toMatch(/no tiene productos/)
    expect(completionBlocker(working({ shipping_address: { ...address, phone: "" } }))).toMatch(/teléfono/)
    expect(completionBlocker(working({ shipping_address: { ...address, address_1: "  " } }))).toMatch(/dirección/)
    expect(completionBlocker(working({ shipping_methods: [] }))).toMatch(/método de envío/)
  })
})

describe("spanishWorkflowError", () => {
  const reword = (message: string) => (spanishWorkflowError(new Error(message)) as Error).message

  it("rewords the failures the owner can run into", () => {
    expect(reword("Some variant does not have the required inventory")).toMatch(/suficiente inventario/)
    expect(reword("Variants with IDs variant_1 do not have a price")).toMatch(/no tiene precio/)
    expect(reword("Shipping Options are invalid for cart.")).toMatch(/método de envío no está disponible/)
    expect(reword("Cart cart_1 is already completed.")).toBe("Ese pedido ya fue creado.")
    expect(reword("The promotion code X is invalid")).toMatch(/código de descuento/)
  })

  it("keeps the same error object, so its type and status survive", () => {
    const error = Object.assign(new Error("Some variant does not have the required inventory"), {
      type: "not_allowed",
    })
    const result = spanishWorkflowError(error)
    expect(result).toBe(error)
    expect((result as any).type).toBe("not_allowed")
  })

  it("leaves what it does not know alone", () => {
    expect(reword("La tienda no vende a ese país (JP).")).toBe("La tienda no vende a ese país (JP).")
    expect(spanishWorkflowError("texto suelto")).toBe("texto suelto")
    expect(spanishWorkflowError(null)).toBeNull()
  })
})

describe("compact orders", () => {
  const order = (overrides: Record<string, unknown> = {}) => ({
    id: "order_1",
    display_id: 12,
    created_at: new Date("2026-11-11T12:00:00Z"),
    status: "pending",
    payment_status: "authorized",
    fulfillment_status: "not_fulfilled",
    total: { value: "1880", precision: 20 },
    currency_code: "hnl",
    email: null,
    metadata: {
      [MANUAL_ORDER_KEY]: { created_by: "u", source: "manual" },
      contra_entrega: { surcharge: 94, collect_total: 1974, surcharge_rate: 0.05 },
    },
    shipping_address: address,
    items: [
      { product_title: "Camiseta Gótica", variant_title: "M", quantity: 2, thumbnail: null, extra: "dropped" },
      { title: "Hoodie", quantity: 1 },
      { product_title: "Gorra", quantity: 1 },
      { product_title: "Calcetas", quantity: 3 },
    ],
    payment_collections: [
      {
        payments: [
          { id: "pay_old", provider_id: BAC_PROVIDER_ID, canceled_at: "2026-11-10T00:00:00Z" },
          { id: "pay_1", provider_id: CONTRA_ENTREGA_PROVIDER_ID, canceled_at: null },
        ],
      },
    ],
    ...overrides,
  })

  it("keeps only what a card shows", () => {
    expect(toCompactOrder(order())).toEqual({
      id: "order_1",
      display_id: 12,
      created_at: "2026-11-11T12:00:00.000Z",
      status: "pending",
      payment_status: "authorized",
      fulfillment_status: "not_fulfilled",
      total: 1880,
      currency_code: "hnl",
      customer_name: "María López Zelaya",
      phone: "9876-5432",
      country_code: "hn",
      city: "Tegucigalpa",
      province: "Francisco Morazán",
      email: null,
      item_count: 7,
      items: [
        { title: "Camiseta Gótica", variant_title: "M", quantity: 2, thumbnail: null },
        { title: "Hoodie", variant_title: null, quantity: 1, thumbnail: null },
        { title: "Gorra", variant_title: null, quantity: 1, thumbnail: null },
      ],
      // The payment that stands, not the canceled attempt before it.
      payment_provider: CONTRA_ENTREGA_PROVIDER_ID,
      collect_total: 1974,
      bac_status: null,
      manual: true,
    })
  })

  it("only speaks of cash to collect for contra entrega", () => {
    const bac = toCompactOrder(
      order({
        metadata: { bac_transfer_status: "proof_uploaded", contra_entrega: { collect_total: 1 } },
        payment_collections: [{ payments: [{ id: "p", provider_id: BAC_PROVIDER_ID }] }],
      })
    )
    expect(bac.collect_total).toBeNull()
    expect(bac.bac_status).toBe("proof_uploaded")
    expect(bac.manual).toBe(false)
  })

  it("survives an order with nothing on it", () => {
    expect(toCompactOrder({ id: "order_2" })).toMatchObject({
      id: "order_2",
      display_id: null,
      customer_name: "",
      phone: "",
      item_count: 0,
      items: [],
      payment_provider: null,
      collect_total: null,
      total: 0,
    })
  })

  it("sorts orders into what is still owed and what still has to ship", () => {
    const view = (o: Record<string, string>, v: "all" | "unpaid" | "unfulfilled") => orderMatchesView(o, v)
    expect(view({ status: "pending", payment_status: "authorized" }, "unpaid")).toBe(true)
    expect(view({ status: "pending", payment_status: "not_paid" }, "unpaid")).toBe(true)
    expect(view({ status: "pending", payment_status: "partially_captured" }, "unpaid")).toBe(true)
    expect(view({ status: "pending", payment_status: "captured" }, "unpaid")).toBe(false)
    expect(view({ status: "pending", payment_status: "refunded" }, "unpaid")).toBe(false)
    expect(view({ status: "pending", fulfillment_status: "not_fulfilled" }, "unfulfilled")).toBe(true)
    expect(view({ status: "pending", fulfillment_status: "partially_fulfilled" }, "unfulfilled")).toBe(true)
    expect(view({ status: "pending", fulfillment_status: "shipped" }, "unfulfilled")).toBe(false)
    expect(view({ status: "pending", fulfillment_status: "delivered" }, "unfulfilled")).toBe(false)
    // A canceled order owes nothing and ships nothing.
    expect(view({ status: "canceled", payment_status: "authorized" }, "unpaid")).toBe(false)
    expect(view({ status: "canceled", fulfillment_status: "not_fulfilled" }, "unfulfilled")).toBe(false)
    expect(view({ status: "canceled" }, "all")).toBe(true)
  })
})

describe("compact products", () => {
  const level = (stocked: number, reserved = 0) => ({ location_id: "sloc_1", stocked_quantity: stocked, reserved_quantity: reserved })
  const product = {
    id: "prod_1",
    title: "Camiseta Gótica",
    thumbnail: null,
    status: "published",
    variants: [
      {
        id: "v_l",
        title: "L",
        sku: "CG-L",
        manage_inventory: true,
        allow_backorder: false,
        calculated_price: { calculated_amount: 450 },
        inventory_items: [{ inventory_item_id: "iitem_l", required_quantity: 1, inventory: { location_levels: [level(5, 2)] } }],
      },
      {
        id: "v_s",
        title: "S",
        manage_inventory: true,
        calculated_price: { calculated_amount: "450.5" },
        inventory_items: [
          { inventory_item_id: "iitem_s", required_quantity: 1, inventory: { location_levels: [level(1), { ...level(4), location_id: "sloc_2" }] } },
        ],
      },
      { id: "v_m", title: "M", manage_inventory: false, calculated_price: null },
    ],
  }

  it("orders the sizes and gives each its price and what is left", () => {
    const compact = toCompactProduct(product, { v_l: { availability: 3 }, v_s: { availability: 5 } })
    expect(compact.variants.map((v) => [v.title, v.price, v.available])).toEqual([
      ["S", 450.5, 5],
      ["M", null, null],
      ["L", 450, 3],
    ])
  })

  it("says where the stock is only when a phone can edit it", () => {
    const compact = toCompactProduct(product, {})
    const by = Object.fromEntries(compact.variants.map((v) => [v.title, v]))
    expect(by.L.stock).toEqual({ inventory_item_id: "iitem_l", location_id: "sloc_1", stocked: 5, reserved: 2 })
    // Two locations: not something a plus and a minus can express.
    expect(by.S.stock).toBeNull()
    // Stock not tracked at all.
    expect(by.M.stock).toBeNull()
    // Nothing known about availability reads as none left, never negative.
    expect(by.L.available).toBe(0)
  })
})

describe("request validation", () => {
  const body = {
    items: [{ variant_id: "variant_1", quantity: 2 }],
    shipping_address: { ...address, country_code: "HN" },
  }

  it("accepts an order with no email and lowercases the country", () => {
    const parsed = CreateManualOrderCartSchema.parse({ ...body, email: "  " })
    expect(parsed.email).toBeNull()
    expect(parsed.shipping_address.country_code).toBe("hn")
    expect(parsed.shipping_address.address_2).toBe("Frente a la pulpería")
    expect(CreateManualOrderCartSchema.parse(body).email ?? null).toBeNull()
  })

  it("refuses what cannot be an order", () => {
    const bad = (patch: Record<string, unknown>) =>
      CreateManualOrderCartSchema.safeParse({ ...body, ...patch }).success
    expect(bad({ items: [] })).toBe(false)
    expect(bad({ items: [{ variant_id: "v", quantity: 0 }] })).toBe(false)
    expect(bad({ items: [{ variant_id: "v", quantity: 1.5 }] })).toBe(false)
    expect(bad({ items: [{ variant_id: "v", quantity: 100 }] })).toBe(false)
    expect(bad({ email: "no-es-correo" })).toBe(false)
    expect(bad({ shipping_address: { ...address, phone: "123" } })).toBe(false)
    expect(bad({ shipping_address: { ...address, first_name: " " } })).toBe(false)
    expect(bad({ shipping_address: { ...address, country_code: "hnd" } })).toBe(false)
    expect(bad({ shipping_address: { ...address, address_1: "" } })).toBe(false)
  })

  it("only knows the two ways of paying", () => {
    expect(CompleteManualOrderSchema.safeParse({ payment_method: "contra_entrega" }).success).toBe(true)
    expect(CompleteManualOrderSchema.safeParse({ payment_method: "transferencia_bac", apply_surcharge: false, note: null }).success).toBe(true)
    expect(CompleteManualOrderSchema.safeParse({ payment_method: "tarjeta" }).success).toBe(false)
    expect(CompleteManualOrderSchema.safeParse({ payment_method: "contra_entrega", note: "x".repeat(501) }).success).toBe(false)
  })

  it("reads numbers out of the query string", () => {
    expect(StoreCartsQuerySchema.parse({ limit: "10" })).toEqual({ limit: 10 })
    expect(StoreCartsQuerySchema.safeParse({ limit: "0" }).success).toBe(false)
    expect(CompactOrdersQuerySchema.parse({ view: "unpaid", offset: "15" })).toEqual({ view: "unpaid", offset: 15 })
    expect(CompactOrdersQuerySchema.safeParse({ view: "otra" }).success).toBe(false)
    expect(CompactProductsQuerySchema.parse({ status: "all", q: "camisa" })).toEqual({ status: "all", q: "camisa" })
    expect(CompactProductsQuerySchema.safeParse({ limit: "500" }).success).toBe(false)
  })
})
