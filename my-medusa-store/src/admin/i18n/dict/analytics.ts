import type { Preset } from "../../lib/analytics"
import type { Words } from "./words"

/** Estadísticas: the page, its cards, the live panel and the chart. */

type PresetWords = {
  /** "Hoy", "Últimos 7 días"… */
  label: string
  /** What it is compared with, ready to follow "vs.", "con" or "contra". */
  ref: string
}

export const analyticsEs = {
  title: "Estadísticas",
  storeTime: "hora de Honduras",
  subtitleShort: "Ventas y visitas",
  subtitleLong: "Ventas y visitas de la tienda",
  refresh: "Actualizar ahora",
  period: "Período",

  presets: {
    today: { label: "Hoy", ref: "ayer a esta hora" },
    yesterday: { label: "Ayer", ref: "el día anterior" },
    last_7_days: { label: "Últimos 7 días", ref: "los 7 días anteriores" },
    last_30_days: { label: "Últimos 30 días", ref: "los 30 días anteriores" },
    last_90_days: { label: "Últimos 90 días", ref: "los 90 días anteriores" },
    this_month: { label: "Este mes", ref: "los mismos días del mes pasado" },
    last_month: { label: "Mes pasado", ref: "el mes anterior" },
    this_year: { label: "Este año", ref: "los mismos días del año pasado" },
  } as Record<Preset, PresetWords>,
  vs: (ref: string) => `vs. ${ref}`,
  against: (ref: string) => `contra ${ref}`,
  comparedWith: (ref: string) => `Los cambios se comparan con ${ref}.`,

  hero: {
    salesOf: (period: string) => `Ventas · ${period}`,
    aria: (period: string) => `Ventas: ${period}`,
    live: "En vivo",
    peopleNow: (count: number, shown: string) =>
      `${shown} ${count === 1 ? "persona ahora" : "personas ahora"}`,
    photoMode: "Modo foto",
    orders: "Pedidos",
    units: (_count: number, shown: string) => `${shown} u.`,
    averageOrder: "Ticket promedio",
    collected: "Cobrado",
    toCollect: (amount: string) => `${amount} por cobrar`,
  },

  photo: {
    aria: "Modo foto",
    visits: "Visitas",
    amountsHidden: "Montos ocultos",
    hideAmounts: "Ocultar montos",
    tapHint: "Tocá la pantalla para esconder estos controles",
    close: "Cerrar",
    sceneAria: "Qué se muestra",
    sceneBoard: "Marcador",
    sceneStack: "Notificaciones",
    stackTitle: "Nuevo pedido",
    stackEmpty: "Sin pedidos en este período. El primero cae hoy.",
    stackMore: (shown: string) => `+${shown} más`,
    stackAria: "Últimos pedidos",
  },

  pending: {
    title: "Por atender",
    description: "Pedidos abiertos, sin importar las fechas elegidas",
    proofs: (count: number) =>
      count === 1
        ? "comprobante de transferencia por revisar"
        : "comprobantes de transferencia por revisar",
    unpaid: (count: number) => (count === 1 ? "pedido sin cobrar" : "pedidos sin cobrar"),
    toShip: (count: number) =>
      count === 1 ? "pedido sin despachar" : "pedidos sin despachar",
  },

  summary: {
    visits: "Visitas",
    visitsHint: (count: number, shown: string) =>
      `${shown} ${count === 1 ? "persona distinta" : "personas distintas"}`,
    visitsHelp:
      "Sesiones en la tienda. Una sesión termina tras 30 minutos sin actividad. Tus propias visitas cuentan salvo que las excluyas (ver al final).",
    openedWhatsapp: "Abrieron WhatsApp",
    ofVisits: (share: string) => `${share} de las visitas`,
    whatsappHelp: "Visitas que tocaron un botón o enlace de WhatsApp en la tienda.",
    conversion: "Conversión",
    conversionHint: "pedidos por visita",
    conversionHelp:
      "Pedidos ÷ visitas. Como muchos pedidos los hacés vos por WhatsApp, leelo como cuántos pedidos salen por cada visita a la tienda.",
    customers: "Clientes",
    customersHint: (fresh: string, returning: string) =>
      `${fresh} nuevos · ${returning} recurrentes`,
    customersHelp:
      "Clientes distintos del período según el teléfono de envío, no la cuenta: así cuentan bien los pedidos que hacés vos. Recurrente: ya había comprado antes.",
  },

  trend: {
    title: "En el tiempo",
    description: "Este período contra el anterior",
    metrics: { sales: "Ventas", orders: "Pedidos", sessions: "Visitas" },
    showChart: "Ver gráfico",
    showTable: "Ver tabla",
    per: (metric: string, granularity: "hour" | "day" | "month") =>
      `${metric} por ${granularity === "hour" ? "hora" : granularity === "day" ? "día" : "mes"}`,
    thisPeriod: "Este período",
    thisPeriodInline: "este período",
    previousPeriod: "Período anterior",
    previousValue: "Valor anterior",
    hour: "Hora",
    date: "Fecha",
    arrowsHint: (label: string) => `${label}. Usá las flechas para recorrer los valores.`,
  },

  behavior: {
    title: "Qué hacen las visitas",
    description: "Parte de las visitas que llegó a cada paso",
    viewedProduct: "Vieron un producto",
    addedToCart: "Agregaron al carrito",
    reachedCheckout: "Llegaron al checkout",
    openedWhatsapp: "Abrieron WhatsApp",
    purchased: "Compraron en la web",
    /** `show` writes a number the way the page does ("1,204"). */
    footer: (
      v: {
        sessions: number
        pageviews: number
        whatsappClicks: number
        fresh: number
        returning: number
      },
      show: (value: number) => string
    ) =>
      [
        `${show(v.sessions)} ${v.sessions === 1 ? "visita" : "visitas"}`,
        `${show(v.pageviews)} ${v.pageviews === 1 ? "página vista" : "páginas vistas"}`,
        `${show(v.whatsappClicks)} ${v.whatsappClicks === 1 ? "toque" : "toques"} a WhatsApp`,
        `${show(v.fresh)} ${v.fresh === 1 ? "visitante nuevo" : "visitantes nuevos"}, ${show(
          v.returning
        )} que ya ${v.returning === 1 ? "había" : "habían"} venido`,
      ].join(" · "),
  },

  noVisits: "Todavía no hay visitas en este período.",
  noSales: "Sin ventas en este período.",

  sources: {
    title: "De dónde llegan",
    description: "Por sesión. Instagram y Facebook se reconocen aunque no manden referencia.",
  },
  bestSellers: {
    title: "Más vendidos",
    description: "Unidades en pedidos no cancelados",
  },
  mostViewed: {
    title: "Más vistos",
    description: "Visitas a la página del producto y toques a WhatsApp desde ella",
    empty: "Nadie vio productos en este período.",
    views: (count: number, shown: string) => `${shown} ${count === 1 ? "vista" : "vistas"}`,
  },
  provinces: {
    title: "Ventas por departamento",
    description: "Según la dirección de envío",
    orders: (shown: string) => `${shown} ped.`,
  },
  methods: {
    title: "Métodos de pago",
    description: "Vendido y, al lado, lo ya cobrado",
    collected: (amount: string) => `${amount} cobrado`,
  },
  audience: {
    title: "Dispositivos y ciudades",
    description: "Por sesión",
    otherCities: "Otras ciudades",
  },
  landing: {
    title: "Páginas de entrada",
    description: "Dónde empieza cada visita",
  },
  whatsappPages: {
    title: "Desde dónde abren WhatsApp",
    description: "Toques a WhatsApp por página",
    empty: "Nadie abrió WhatsApp en este período.",
  },

  notes: {
    title: "Para que tus visitas no cuenten",
    before:
      "Como hacés pedidos desde la tienda, tus propias visitas inflarían las estadísticas. Abrí",
    middle: "una vez en cada celular y computadora que usás. Con",
    after: "se vuelve a contar. Los pedidos que hacés siempre cuentan como ventas.",
    privacy:
      "Todas las fechas y horas son de Honduras. No se guardan direcciones IP ni datos personales de las visitas.",
  },

  change: { flat: "Sin cambio", up: "Subió", down: "Bajó" },
  loadError: "No se pudieron cargar estos datos.",

  live: {
    title: "En vivo",
    noRedis: "Sin Redis: solo este proceso",
    refreshes: "Se actualiza cada 5 segundos",
    unknownPlace: "Ubicación desconocida",
    cameFrom: (source: string) => `llegó por ${source}`,
    badgeCart: "Carrito",
    badgeCheckout: "Checkout",
    badgeBought: "Compró",
    badgeAccount: "Con cuenta",
    pages: (count: number) => `${count} ${count === 1 ? "página" : "páginas"}`,
    inStoreNow: (count: number) =>
      count === 1 ? "persona en la tienda ahora" : "personas en la tienda ahora",
    recent: (shown: string, minutes: number) =>
      `${shown} en los últimos ${minutes} minutos`,
    viewingProducts: "Viendo productos",
    withCart: "Con carrito",
    inCheckout: "En el checkout",
    openedWhatsapp: "Abrieron WhatsApp",
    today: "Hoy",
    visits: (count: number, shown: string) =>
      `${shown} ${count === 1 ? "visita" : "visitas"}`,
    pageviews: (count: number, shown: string) =>
      `${shown} ${count === 1 ? "página vista" : "páginas vistas"}`,
    openedWhatsappCount: (shown: string) => `${shown} abrieron WhatsApp`,
    nobody: "Nadie en la tienda en este momento.",
    showLess: "Ver menos",
    showAll: (count: number) => `Ver los ${count} visitantes`,
  },

  format: {
    underAMinute: "menos de 1 min",
    sources: {
      meta: "Facebook o Instagram",
      x: "X (Twitter)",
      buscadores: "Otros buscadores",
      email: "Correo",
      otro: "Otros sitios",
      directo: "Directo",
    } as Record<string, string>,
    devices: { mobile: "Celular", tablet: "Tablet", desktop: "Computadora" } as Record<
      string,
      string
    >,
    pages: {
      "/": "Inicio",
      "/store": "Catálogo",
      "/cart": "Carrito",
      "/checkout": "Checkout",
      "/order/:id/confirmed": "Pedido confirmado",
      "/order/:id/transferencia-bac": "Datos de transferencia BAC",
      "/order/:id": "Traspaso de pedido",
      "/account": "Mi cuenta",
      "/envios": "Envíos",
      "/guia-de-tallas": "Guía de tallas",
      "/preguntas-frecuentes": "Preguntas frecuentes",
      "/sobre-nosotros": "Sobre nosotros",
      "/colaboraciones": "Colaboraciones",
      "/reset-password": "Restablecer contraseña",
      "/otra": "Otras páginas",
      "(otras)": "Otras páginas",
    } as Record<string, string>,
    product: (name: string) => `Producto: ${name}`,
    category: (name: string) => `Categoría: ${name}`,
    collection: (name: string) => `Colección: ${name}`,
    account: "Mi cuenta",
    activity: {
      product: "Viendo un producto",
      cart: "En el carrito",
      checkout: "En el checkout",
      purchase: "Terminando su pedido",
      catalog: "Mirando el catálogo",
      home: "En el inicio",
      account: "En su cuenta",
      other: "Navegando",
    },
    payment: {
      none: "Sin pago registrado",
      bac: "Transferencia BAC",
      cashOnDelivery: "Contra entrega",
      manual: "Pago manual",
      card: "Tarjeta",
    },
  },
}

export const analyticsEn: Words<typeof analyticsEs> = {
  title: "Statistics",
  storeTime: "Honduras time",
  subtitleShort: "Sales and visits",
  subtitleLong: "Store sales and visits",
  refresh: "Refresh now",
  period: "Period",

  presets: {
    today: { label: "Today", ref: "yesterday at this time" },
    yesterday: { label: "Yesterday", ref: "the day before" },
    last_7_days: { label: "Last 7 days", ref: "the previous 7 days" },
    last_30_days: { label: "Last 30 days", ref: "the previous 30 days" },
    last_90_days: { label: "Last 90 days", ref: "the previous 90 days" },
    this_month: { label: "This month", ref: "the same days last month" },
    last_month: { label: "Last month", ref: "the month before" },
    this_year: { label: "This year", ref: "the same days last year" },
  },
  vs: (ref) => `vs. ${ref}`,
  against: (ref) => `vs. ${ref}`,
  comparedWith: (ref) => `Changes are compared with ${ref}.`,

  hero: {
    salesOf: (period) => `Sales · ${period}`,
    aria: (period) => `Sales: ${period}`,
    live: "Live",
    peopleNow: (count, shown) => `${shown} ${count === 1 ? "person now" : "people now"}`,
    photoMode: "Photo mode",
    orders: "Orders",
    units: (count, shown) => `${shown} ${count === 1 ? "unit" : "units"}`,
    averageOrder: "Average order",
    collected: "Collected",
    toCollect: (amount) => `${amount} to collect`,
  },

  photo: {
    aria: "Photo mode",
    visits: "Visits",
    amountsHidden: "Amounts hidden",
    hideAmounts: "Hide amounts",
    tapHint: "Tap the screen to hide these controls",
    close: "Close",
    sceneAria: "What is shown",
    sceneBoard: "Scoreboard",
    sceneStack: "Notifications",
    stackTitle: "New order",
    stackEmpty: "No orders in this period. The first one lands today.",
    stackMore: (shown) => `+${shown} more`,
    stackAria: "Latest orders",
  },

  pending: {
    title: "Needs attention",
    description: "Open orders, whatever dates are selected",
    proofs: (count) =>
      count === 1 ? "transfer receipt to review" : "transfer receipts to review",
    unpaid: (count) => (count === 1 ? "unpaid order" : "unpaid orders"),
    toShip: (count) => (count === 1 ? "order to ship" : "orders to ship"),
  },

  summary: {
    visits: "Visits",
    visitsHint: (count, shown) =>
      `${shown} ${count === 1 ? "unique person" : "unique people"}`,
    visitsHelp:
      "Sessions on the store. A session ends after 30 minutes without activity. Your own visits count unless you exclude them (see the end of the page).",
    openedWhatsapp: "Opened WhatsApp",
    ofVisits: (share) => `${share} of visits`,
    whatsappHelp: "Visits that tapped a WhatsApp button or link on the store.",
    conversion: "Conversion",
    conversionHint: "orders per visit",
    conversionHelp:
      "Orders ÷ visits. Since you place many orders yourself over WhatsApp, read it as how many orders come out of each visit to the store.",
    customers: "Customers",
    customersHint: (fresh, returning) => `${fresh} new · ${returning} returning`,
    customersHelp:
      "Unique customers in the period by shipping phone, not by account, so the orders you place yourself count properly. Returning: had bought before.",
  },

  trend: {
    title: "Over time",
    description: "This period against the previous one",
    metrics: { sales: "Sales", orders: "Orders", sessions: "Visits" },
    showChart: "Show chart",
    showTable: "Show table",
    per: (metric, granularity) => `${metric} per ${granularity}`,
    thisPeriod: "This period",
    thisPeriodInline: "this period",
    previousPeriod: "Previous period",
    previousValue: "Previous value",
    hour: "Hour",
    date: "Date",
    arrowsHint: (label) => `${label}. Use the arrow keys to move through the values.`,
  },

  behavior: {
    title: "What visitors do",
    description: "Share of visits that reached each step",
    viewedProduct: "Viewed a product",
    addedToCart: "Added to cart",
    reachedCheckout: "Reached checkout",
    openedWhatsapp: "Opened WhatsApp",
    purchased: "Bought on the site",
    footer: (v, show) =>
      [
        `${show(v.sessions)} ${v.sessions === 1 ? "visit" : "visits"}`,
        `${show(v.pageviews)} ${v.pageviews === 1 ? "page view" : "page views"}`,
        `${show(v.whatsappClicks)} WhatsApp ${v.whatsappClicks === 1 ? "tap" : "taps"}`,
        `${show(v.fresh)} ${v.fresh === 1 ? "new visitor" : "new visitors"}, ${show(
          v.returning
        )} returning`,
      ].join(" · "),
  },

  noVisits: "No visits in this period yet.",
  noSales: "No sales in this period.",

  sources: {
    title: "Where they come from",
    description: "Per session. Instagram and Facebook are recognized even when they send no referrer.",
  },
  bestSellers: {
    title: "Best sellers",
    description: "Units in orders that were not canceled",
  },
  mostViewed: {
    title: "Most viewed",
    description: "Visits to the product page and WhatsApp taps from it",
    empty: "Nobody viewed products in this period.",
    views: (count, shown) => `${shown} ${count === 1 ? "view" : "views"}`,
  },
  provinces: {
    title: "Sales by department",
    description: "By shipping address",
    orders: (shown) => `${shown} ord.`,
  },
  methods: {
    title: "Payment methods",
    description: "Sold and, next to it, what has been collected",
    collected: (amount) => `${amount} collected`,
  },
  audience: {
    title: "Devices and cities",
    description: "Per session",
    otherCities: "Other cities",
  },
  landing: {
    title: "Landing pages",
    description: "Where each visit starts",
  },
  whatsappPages: {
    title: "Where they open WhatsApp from",
    description: "WhatsApp taps per page",
    empty: "Nobody opened WhatsApp in this period.",
  },

  notes: {
    title: "So your own visits don't count",
    before:
      "Since you place orders from the store, your own visits would inflate the statistics. Open",
    middle: "once on every phone and computer you use. With",
    after: "they count again. The orders you place always count as sales.",
    privacy:
      "All dates and times are Honduras time. No IP addresses or personal data of visitors are stored.",
  },

  change: { flat: "No change", up: "Up", down: "Down" },
  loadError: "Could not load this data.",

  live: {
    title: "Live",
    noRedis: "No Redis: this process only",
    refreshes: "Updates every 5 seconds",
    unknownPlace: "Unknown location",
    cameFrom: (source) => `came from ${source}`,
    badgeCart: "Cart",
    badgeCheckout: "Checkout",
    badgeBought: "Bought",
    badgeAccount: "Signed in",
    pages: (count) => `${count} ${count === 1 ? "page" : "pages"}`,
    inStoreNow: (count) =>
      count === 1 ? "person on the store right now" : "people on the store right now",
    recent: (shown, minutes) => `${shown} in the last ${minutes} minutes`,
    viewingProducts: "Viewing products",
    withCart: "With a cart",
    inCheckout: "In checkout",
    openedWhatsapp: "Opened WhatsApp",
    today: "Today",
    visits: (count, shown) => `${shown} ${count === 1 ? "visit" : "visits"}`,
    pageviews: (count, shown) => `${shown} ${count === 1 ? "page view" : "page views"}`,
    openedWhatsappCount: (shown) => `${shown} opened WhatsApp`,
    nobody: "Nobody on the store right now.",
    showLess: "Show less",
    showAll: (count) => `Show all ${count} visitors`,
  },

  format: {
    underAMinute: "under 1 min",
    sources: {
      meta: "Facebook or Instagram",
      x: "X (Twitter)",
      buscadores: "Other search engines",
      email: "Email",
      otro: "Other sites",
      directo: "Direct",
    },
    devices: { mobile: "Phone", tablet: "Tablet", desktop: "Computer" },
    pages: {
      "/": "Home",
      "/store": "Catalog",
      "/cart": "Cart",
      "/checkout": "Checkout",
      "/order/:id/confirmed": "Order confirmed",
      "/order/:id/transferencia-bac": "BAC transfer details",
      "/order/:id": "Order transfer",
      "/account": "My account",
      "/envios": "Shipping",
      "/guia-de-tallas": "Size guide",
      "/preguntas-frecuentes": "FAQ",
      "/sobre-nosotros": "About us",
      "/colaboraciones": "Collaborations",
      "/reset-password": "Reset password",
      "/otra": "Other pages",
      "(otras)": "Other pages",
    },
    product: (name) => `Product: ${name}`,
    category: (name) => `Category: ${name}`,
    collection: (name) => `Collection: ${name}`,
    account: "My account",
    activity: {
      product: "Viewing a product",
      cart: "In the cart",
      checkout: "In checkout",
      purchase: "Finishing their order",
      catalog: "Browsing the catalog",
      home: "On the home page",
      account: "In their account",
      other: "Browsing",
    },
    payment: {
      none: "No payment recorded",
      bac: "BAC transfer",
      cashOnDelivery: "Cash on delivery",
      manual: "Manual payment",
      card: "Card",
    },
  },
}
