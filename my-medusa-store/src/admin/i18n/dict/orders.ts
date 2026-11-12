import type { Words } from "./words"

/**
 * Orders: the phone list, the card at the top of an order, the states of an
 * order in the owner's terms, and the pieces every phone list shares.
 *
 * The WhatsApp messages themselves are not here: they are written to the
 * customer, in Spanish, whatever language the panel is in (lib/whatsapp.ts).
 * Only what the owner reads about them is: their names and what each is for.
 */

type TemplateId = "saludo" | "confirmar" | "en-camino" | "coordinar" | "comprobante"

export const ordersEs = {
  /** Shared by the phone lists of orders, products and inventory. */
  list: {
    clearSearch: "Borrar búsqueda",
    retry: "Reintentar",
    loadMore: "Cargar más",
    shownOf: (shown: number, total: number, noun: string) => `${shown} de ${total} ${noun}`,
    noResults: "Sin resultados",
    nothingMatches: (query: string) => `Nada coincide con «${query}».`,
    refresh: "Actualizar",
    all: "Todos",
  },

  payment: {
    not_paid: "Sin pagar",
    awaiting: "Esperando pago",
    authorized: "Por cobrar",
    partially_authorized: "Por cobrar",
    requires_action: "Pago por revisar",
    partially_captured: "Cobrado en parte",
    captured: "Cobrado",
    partially_refunded: "Reembolso parcial",
    refunded: "Reembolsado",
    canceled: "Pago cancelado",
  } as Record<string, string>,
  fulfillment: {
    not_fulfilled: "Por despachar",
    partially_fulfilled: "Despacho parcial",
    fulfilled: "Despachado",
    partially_shipped: "Envío parcial",
    shipped: "Enviado",
    partially_delivered: "Entrega parcial",
    delivered: "Entregado",
    canceled: "Envío cancelado",
  } as Record<string, string>,
  justNow: "ahora",
  andMore: (shown: string, rest: number) => `${shown} y ${rest} más`,

  title: "Pedidos",
  newOrder: "Nuevo pedido",
  searchPlaceholder: "Número, nombre o correo",
  searchLabel: "Buscar pedidos",
  filterAria: "Filtrar pedidos",
  unpaid: "Por cobrar",
  unfulfilled: "Por despachar",
  toCollectIn: (amount: string, count: number) =>
    `${amount} por cobrar en ${count} ${count === 1 ? "pedido" : "pedidos"}.`,
  loadError: "No se pudieron cargar los pedidos.",
  noun: (count: number) => (count === 1 ? "pedido" : "pedidos"),
  empty: {
    all: {
      title: "Todavía no hay pedidos",
      detail: "Cuando entre el primero, o lo registrés con «Nuevo pedido», aparece aquí.",
    },
    unpaid: {
      title: "Nada por cobrar",
      detail: "Todos los pedidos abiertos están pagados.",
    },
    unfulfilled: {
      title: "Nada por despachar",
      detail: "Todos los pedidos abiertos ya salieron.",
    },
  },

  card: {
    noName: "Cliente sin nombre",
    order: "Pedido",
    aria: (number: string, name: string) => `${number} de ${name}`,
    noAddress: "Sin dirección",
    collect: (amount: string) => `cobrar ${amount}`,
    canceled: "Cancelado",
    proofToReview: "Comprobante por revisar",
  },

  /** The way into "Nuevo pedido" above the orders table, on a computer. */
  top: {
    question: "¿Venta por WhatsApp o contra entrega?",
    hint: "Registrá el pedido desde aquí, sin comprarlo vos en la tienda.",
  },

  whatsapp: {
    to: (label: string, number: string) => `${label} a ${number}`,
    others: "Otros mensajes de WhatsApp",
    ready: "Mensajes listos",
    templates: {
      saludo: { label: "Saludo", hint: "Abre el chat con una línea" },
      confirmar: {
        label: "Confirmar pedido",
        hint: "Productos, total y dirección para que diga que sí",
      },
      "en-camino": { label: "Va en camino", hint: "Avisa que ya salió" },
      coordinar: { label: "Coordinar entrega", hint: "Pregunta a qué hora puede recibir" },
      comprobante: {
        label: "Pedir comprobante",
        hint: "Para transferencias que no han mandado el recibo",
      },
    } as Record<TemplateId, { label: string; hint: string }>,
    typeNumber: "Escribir el número",
    numberLabel: "Número de WhatsApp",
    numberHelp:
      "Con el código del país si no es de Honduras: +1 305 555 1234. Solo se usa para abrir el chat; el pedido no cambia.",
    guessed: (display: string) =>
      `El número no dice de qué país es; lo completamos como ${display}.`,
    fix: "Corregir",
  },

  contact: {
    noName: "Cliente sin nombre",
    nothingToReach: "Sin teléfono ni dirección",
    reference: (references: string) => ` · Ref: ${references}`,
    call: "Llamar",
    ship: "Despachar",
    cancel: "Cancelar",
    orderCanceled: "Pedido cancelado",
    note: "Nota:",

    cashOnDelivery: "Pago contra entrega",
    collected: "Cobrado",
    toCollect: "Por cobrar",
    collectOnDelivery: "Cobrar al entregar:",
    withSurcharge: (total: string, surcharge: string) =>
      ` (pedido ${total} + ${surcharge} de recargo de la empresa de envíos)`,
    noSurcharge: " (sin recargo)",
    markCollected: "Marcar cobrado",
    collectedToast: "Pedido marcado como cobrado.",
    collectFailed: "No se pudo marcar como cobrado.",
    collectPrompt: {
      title: "¿Ya recibiste el pago?",
      description: (amount: string) =>
        `Se va a registrar que cobraste ${amount} de este pedido. No se puede deshacer desde aquí.`,
      confirm: "Sí, cobrado",
      cancel: "Todavía no",
    },

    transfer: "Transferencia BAC",
    paid: "Pagado",
    awaitingPayment: "Esperando el pago",
    received: (amount: string) => `Recibiste ${amount}.`,
    whenItArrives: (amount: string) =>
      `Cuando veás los ${amount} en la cuenta, confirmalo aquí.`,
    confirmPayment: "Confirmar pago",
    transferToast: "Transferencia confirmada.",
    transferFailed: "No se pudo confirmar la transferencia.",
    transferPrompt: {
      title: "¿Ya llegó la transferencia?",
      description: (amount: string, emailed: boolean) =>
        `Se va a registrar que recibiste ${amount} por transferencia${
          emailed ? " y se le avisa al cliente por correo" : ""
        }. No se puede deshacer desde aquí.`,
      confirm: "Sí, llegó",
      cancel: "Todavía no",
    },
  },
}

export const ordersEn: Words<typeof ordersEs> = {
  list: {
    clearSearch: "Clear search",
    retry: "Try again",
    loadMore: "Load more",
    shownOf: (shown, total, noun) => `${shown} of ${total} ${noun}`,
    noResults: "No results",
    nothingMatches: (query) => `Nothing matches “${query}”.`,
    refresh: "Refresh",
    all: "All",
  },

  payment: {
    not_paid: "Not paid",
    awaiting: "Awaiting payment",
    authorized: "To collect",
    partially_authorized: "To collect",
    requires_action: "Payment to review",
    partially_captured: "Partly collected",
    captured: "Collected",
    partially_refunded: "Partly refunded",
    refunded: "Refunded",
    canceled: "Payment canceled",
  },
  fulfillment: {
    not_fulfilled: "To ship",
    partially_fulfilled: "Partly dispatched",
    fulfilled: "Dispatched",
    partially_shipped: "Partly shipped",
    shipped: "Shipped",
    partially_delivered: "Partly delivered",
    delivered: "Delivered",
    canceled: "Shipment canceled",
  },
  justNow: "now",
  andMore: (shown, rest) => `${shown} and ${rest} more`,

  title: "Orders",
  newOrder: "New order",
  searchPlaceholder: "Number, name or email",
  searchLabel: "Search orders",
  filterAria: "Filter orders",
  unpaid: "To collect",
  unfulfilled: "To ship",
  toCollectIn: (amount, count) =>
    `${amount} to collect across ${count} ${count === 1 ? "order" : "orders"}.`,
  loadError: "Could not load the orders.",
  noun: (count) => (count === 1 ? "order" : "orders"),
  empty: {
    all: {
      title: "No orders yet",
      detail: "When the first one comes in, or you register it with “New order”, it shows up here.",
    },
    unpaid: {
      title: "Nothing to collect",
      detail: "Every open order is paid.",
    },
    unfulfilled: {
      title: "Nothing to ship",
      detail: "Every open order has gone out.",
    },
  },

  card: {
    noName: "Customer with no name",
    order: "Order",
    aria: (number, name) => `${number} from ${name}`,
    noAddress: "No address",
    collect: (amount) => `collect ${amount}`,
    canceled: "Canceled",
    proofToReview: "Receipt to review",
  },

  top: {
    question: "A sale over WhatsApp or cash on delivery?",
    hint: "Register the order from here, without buying it yourself on the store.",
  },

  whatsapp: {
    to: (label, number) => `${label} to ${number}`,
    others: "Other WhatsApp messages",
    ready: "Ready-made messages (sent in Spanish)",
    templates: {
      saludo: { label: "Greeting", hint: "Opens the chat with one line" },
      confirmar: {
        label: "Confirm the order",
        hint: "Products, total and address, for them to say yes",
      },
      "en-camino": { label: "On its way", hint: "Lets them know it has left" },
      coordinar: { label: "Arrange delivery", hint: "Asks what time suits them" },
      comprobante: {
        label: "Ask for the receipt",
        hint: "For transfers that have not sent it yet",
      },
    },
    typeNumber: "Type the number",
    numberLabel: "WhatsApp number",
    numberHelp:
      "With the country code if it is not Honduran: +1 305 555 1234. Only used to open the chat; the order does not change.",
    guessed: (display) =>
      `The number doesn't say which country it is from; we completed it as ${display}.`,
    fix: "Fix it",
  },

  contact: {
    noName: "Customer with no name",
    nothingToReach: "No phone or address",
    reference: (references) => ` · Ref: ${references}`,
    call: "Call",
    ship: "Ship",
    cancel: "Cancel",
    orderCanceled: "Order canceled",
    note: "Note:",

    cashOnDelivery: "Cash on delivery",
    collected: "Collected",
    toCollect: "To collect",
    collectOnDelivery: "Collect on delivery:",
    withSurcharge: (total, surcharge) =>
      ` (order ${total} + ${surcharge} courier surcharge)`,
    noSurcharge: " (no surcharge)",
    markCollected: "Mark as collected",
    collectedToast: "Order marked as collected.",
    collectFailed: "Could not mark it as collected.",
    collectPrompt: {
      title: "Did you get the payment?",
      description: (amount) =>
        `It will be recorded that you collected ${amount} for this order. It cannot be undone from here.`,
      confirm: "Yes, collected",
      cancel: "Not yet",
    },

    transfer: "BAC transfer",
    paid: "Paid",
    awaitingPayment: "Awaiting payment",
    received: (amount) => `You received ${amount}.`,
    whenItArrives: (amount) => `When you see the ${amount} in the account, confirm it here.`,
    confirmPayment: "Confirm payment",
    transferToast: "Transfer confirmed.",
    transferFailed: "Could not confirm the transfer.",
    transferPrompt: {
      title: "Has the transfer arrived?",
      description: (amount, emailed) =>
        `It will be recorded that you received ${amount} by transfer${
          emailed ? " and the customer is told by email" : ""
        }. It cannot be undone from here.`,
      confirm: "Yes, it arrived",
      cancel: "Not yet",
    },
  },
}
