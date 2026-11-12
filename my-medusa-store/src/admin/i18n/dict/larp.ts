import type { Words } from "./words"

/**
 * The panel's voice: the lines under the day's figure, the phrases on the
 * moving ticker and the words around the streak.
 *
 * Spanish and English are mixed on purpose, in both languages: that is how
 * the people who post their dashboards actually write ("locked in", "aura",
 * "cine", "factos", "W"). The Spanish set leans on Spanish with the English
 * slang left as is; the English set does the reverse.
 *
 * Every line is a reading of real figures (see lib/larp.ts for which one is
 * shown when). Nothing here invents a number.
 */

export type Mood = "quiet" | "first" | "cooking" | "up" | "down"

export const larpEs = {
  /** One of these under the headline figure, by how the period is going. */
  captions: {
    quiet: [
      "En blanco, por ahora. Lock in.",
      "El primero siempre cuesta. Después llueven.",
      "Nadie ve el grind. Todos ven el resultado.",
      "Quiet on the creek… por ahora.",
    ],
    first: ["Cayó el primero. We're so back.", "Primer W del día. Faltan los demás."],
    cooking: [
      "Cocinando. Que nadie toque nada.",
      "Locked in. La caja suena.",
      "Así se ve tu prime.",
      "Farmeando aura, pedido a pedido.",
    ],
    up: [
      "Mogging al período anterior.",
      "Esto es cine.",
      "Aura +1000. Factos.",
      "Pop off. Ate and left no crumbs.",
    ],
    down: [
      "Vamos abajo. Lock in, que todavía hay tiempo.",
      "Canon event: de estos días también se aprende.",
      "No es un L, es lore.",
    ],
  } as Record<Mood, string[]>,

  /**
   * Short lines for the ticker, between the figures. Shown in capitals. These
   * are the originals: the owner replaces them with their own in Ajustes →
   * Apariencia, and from then on theirs are the ones that run.
   */
  mantras: [
    "Locked in",
    "Disciplina > motivación",
    "Números reales, cero larp",
    "Que suene la caja",
    "En tu prime",
    "W in the chat",
    "No es suerte, es constancia",
    "Farmeando aura",
    "Hecho en Honduras",
    "Sin excusas",
  ],

  facts: {
    orders: (count: number, shown: string, period: string) =>
      `${shown} ${count === 1 ? "pedido" : "pedidos"} · ${period}`,
    sales: (amount: string, period: string) => `${period}: ${amount}`,
    people: (count: number, shown: string) =>
      `${shown} ${count === 1 ? "persona" : "personas"} en la tienda ahora`,
    averageOrder: (amount: string) => `Ticket promedio ${amount}`,
  },

  streak: (days: number) => `Racha: ${days} ${days === 1 ? "día" : "días"}`,
  streakHelp:
    "Días seguidos con al menos una venta, contando hoy. Los pedidos cancelados no cuentan.",
  streakPending: "Hoy todavía no cae el primero: no rompás la racha.",
  best: (days: number) => `Récord: ${days} ${days === 1 ? "día" : "días"}`,
  dayNumber: (day: string) => `Día ${day}`,
  dayNumberHelp: "Días desde la primera venta de la tienda.",
  activeDays: (days: number) => `${days} de los últimos 30 días con ventas`,
  winterArc: (day: number, of: number) => `Winter Arc · día ${day} de ${of}`,

  tickerAria: "Frases y cifras del día",
  mottoAria: "Lema",
  openerAria: "Frase de apertura",

  /** Appended to a success message while larp mode is on. */
  cheers: { created: "W.", paid: "Aura +1." },
}

export const larpEn: Words<typeof larpEs> = {
  captions: {
    quiet: [
      "Blank so far. Lock in.",
      "The first one is always the hardest. Then they pour in.",
      "Nobody sees the grind. Everybody sees the result.",
      "Quiet on the creek… for now.",
    ],
    first: ["First one's in. We're so back.", "First W of the day. More to come."],
    cooking: [
      "Cooking. Nobody touch anything.",
      "Locked in. La caja suena.",
      "This is what your prime looks like.",
      "Farming aura, one order at a time.",
    ],
    up: [
      "Mogging the previous period.",
      "Absolute cinema.",
      "Aura +1000. Factos.",
      "Popped off. Ate and left no crumbs.",
    ],
    down: [
      "Running behind. Lock in, there's still time.",
      "Canon event: these days teach too.",
      "Not an L. It's lore.",
    ],
  },

  mantras: [
    "Locked in",
    "Discipline > motivation",
    "Real numbers, zero larp",
    "Que suene la caja",
    "In your prime",
    "W in the chat",
    "It's not luck, it's consistency",
    "Farming aura",
    "Hecho en Honduras",
    "No excuses",
  ],

  facts: {
    orders: (count, shown, period) => `${shown} ${count === 1 ? "order" : "orders"} · ${period}`,
    sales: (amount, period) => `${period}: ${amount}`,
    people: (count, shown) =>
      `${shown} ${count === 1 ? "person" : "people"} on the store right now`,
    averageOrder: (amount) => `Average order ${amount}`,
  },

  streak: (days) => `Streak: ${days} ${days === 1 ? "day" : "days"}`,
  streakHelp:
    "Days in a row with at least one sale, counting today. Canceled orders don't count.",
  streakPending: "No sale yet today: don't break the streak.",
  best: (days) => `Best: ${days} ${days === 1 ? "day" : "days"}`,
  dayNumber: (day) => `Day ${day}`,
  dayNumberHelp: "Days since the store's first sale.",
  activeDays: (days) => `${days} of the last 30 days with sales`,
  winterArc: (day, of) => `Winter Arc · day ${day} of ${of}`,

  tickerAria: "Phrases and figures of the day",
  mottoAria: "Motto",
  openerAria: "Opening phrase",

  cheers: { created: "W.", paid: "Aura +1." },
}
