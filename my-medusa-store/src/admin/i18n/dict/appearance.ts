import type { FontSetId, PaletteId } from "../../theme/palettes"
import type { Words } from "./words"

/**
 * Ajustes → Apariencia, the bottom bar and the menu entries of our own pages.
 *
 * Palette names are proper names and stay as they are in both languages
 * (theme/palettes.ts); what is translated is the line under each one.
 */

export const appearanceEs = {
  nav: {
    orders: "Pedidos",
    products: "Productos",
    newOrder: "Nuevo pedido",
    inventory: "Inventario",
    analytics: "Estadísticas",
    appearance: "Apariencia",
    aria: "Secciones principales",
  },

  title: "Apariencia",
  intro:
    "Elegí cómo se ve el panel. Se aplica al instante y se guarda en tu cuenta: el celular y la computadora quedan iguales.",
  saveFailed:
    "No se pudo guardar en tu cuenta. El cambio queda en este dispositivo y se vuelve a enviar la próxima vez que abrás el panel.",

  palette: {
    title: "Paleta",
    description: (mode: "dark" | "light") =>
      `Cada una tiene su lado claro y su lado oscuro. Ahora estás viendo el ${
        mode === "dark" ? "oscuro" : "claro"
      }; se cambia en el menú de tu usuario, en «Tema».`,
    aria: "Paletas",
    light: "Claro",
    dark: "Oscuro",
    inUse: "En uso",
    previewSales: "Ventas de hoy",
    previewCreate: "Crear",
    previewOrders: "Pedidos",
  },
  palettes: {
    catedral: "Negro vacío y violeta sagrado. La tienda, del otro lado del mostrador.",
    tokio: "Lluvia, asfalto y letreros. Para vender de madrugada.",
    roatan: "Arena clara, mar turquesa y un atardecer de coral.",
    copan: "Piedra tallada, jade y estuco. Cuentas con mil años de calma.",
    guacamaya: "Rojo, amarillo y azul en pleno vuelo. Imposible no verla.",
    lempira: "Negro y oro. Para los días en que la caja suena.",
    terminal: "Fósforo verde sobre negro. Todo es una línea de comandos.",
    chicle: "Rosa chicle y celeste. Dosmilero sin pedir perdón.",
    cafe: "Tueste oscuro, crema y cereza madura. Con olor a mañana.",
    winter: "Hielo, acero y cero excusas. De octubre a diciembre no se sale: se cocina.",
    cine: "Blanco y negro con un solo rojo. Para los días que salen de película.",
    clasico: "El panel tal como vino, sin tocar.",
  } as Record<PaletteId, string>,

  type: {
    title: "Tipografía",
    description: "La letra de los títulos y las cifras grandes, y la del resto del panel.",
    byPalette: "Según la paleta",
    byPaletteTagline: (palette: string, font: string) =>
      `La que acompaña a cada paleta. Con ${palette}: ${font}.`,
  },
  fonts: {
    gotica: { name: "Gótica", tagline: "Cinzel en los títulos, como la tienda" },
    moderna: { name: "Moderna", tagline: "Manrope de punta a punta: limpia y con carácter" },
    atletica: { name: "Atlética", tagline: "Big Shoulders: números de marcador" },
    cyber: { name: "Cyber", tagline: "Unbounded y Space Grotesk: año 2000, versión 3000" },
    editorial: { name: "Editorial", tagline: "Instrument Serif: portada de revista" },
    terminal: { name: "Terminal", tagline: "JetBrains Mono en todo: ventas por consola" },
    clasica: { name: "Clásica", tagline: "Inter, la de Medusa" },
  } as Record<FontSetId, { name: string; tagline: string }>,

  language: {
    title: "Idioma",
    description:
      "Todo el panel en español o en inglés: tus secciones y también el resto de Medusa.",
    aria: "Idioma del panel",
    // Each language is offered in its own name, whatever the panel is in.
    names: { es: "Español", en: "English" },
    taglines: { es: "Con voseo, como la tienda", en: "Same panel, in English" },
    mixed:
      "Tus secciones están en español, pero el resto del panel sigue en otro idioma. Tocá «Español» para dejarlo todo igual.",
    customers:
      "Los mensajes para tus clientes (WhatsApp y correos) siguen saliendo en español.",
  },

  larp: {
    title: "Lema y frases",
    description:
      "Tus frases en Estadísticas y la voz del panel. Las palabras son tuyas; los números siempre son los de verdad.",

    openerLabel: "Frase al comienzo de Estadísticas",
    openerHelp:
      "Lo primero que se ve al abrir Estadísticas, antes de los números. Escribí la tuya.",
    openerPlaceholder: "Escribí tu frase",
    openerEmpty: "Todavía no escribiste ninguna, así que no se muestra nada.",

    mottoLabel: "Frase al final de Estadísticas (tu lema)",
    mottoHelp:
      "Tu lema cierra la página. También aparece al iniciar sesión y en Modo foto, aunque acá lo apagués.",
    mottoReset: "Volver al original",

    size: "Tamaño",
    sizes: { sm: "Chica", md: "Mediana", lg: "Grande", xl: "Enorme" },
    hidden: "Apagada: no se muestra en Estadísticas.",

    phrasesLabel: "Frases de la cinta",
    phrasesHelp:
      "Las que corren en la cinta de Estadísticas y de Modo foto, entre las cifras del día. Cambialas, quitá las que no te representan y agregá las tuyas. Salen en mayúsculas, en este orden.",
    phraseAria: (position: number) => `Frase ${position}`,
    phraseRemove: (position: number) => `Quitar la frase ${position}`,
    phraseBlank: "Vacía: no se muestra",
    phraseNew: "Nueva frase",
    phraseNewPlaceholder: "Escribí una frase",
    phraseAdd: "Agregar",
    phrasesCount: (count: number, max: number) => `${count} de ${max}`,
    phrasesFull: (max: number) => `Llegaste a ${max}. Quitá una para agregar otra.`,
    phrasesNone: "Sin frases: la cinta lleva solo tu lema y las cifras del día.",
    phrasesReset: "Volver a las originales",
    phrasesPreview: "Así corre, con tu lema adelante",

    hypeLabel: "Modo larp",
    hypeHelp:
      "La cinta de frases que se mueve, la lectura del día y tu racha en Estadísticas. Apagado, el panel queda sobrio.",
  },

  details: "Detalles",
  auraLabel: "Resplandor de fondo",
  auraOn: "Un brillo suave con los colores de la paleta detrás de las tarjetas.",
  auraOff: "La paleta clásica de Medusa no lo lleva.",
  tabbarLabel: "Barra inferior en el celular",
  tabbarHelp:
    "Pedidos, Productos, Nuevo pedido, Inventario y Estadísticas a un toque, abajo de la pantalla.",
  now: (palette: string, font: string) => `Ahora: ${palette} con tipografía ${font}.`,
  reset: "Restablecer",
}

export const appearanceEn: Words<typeof appearanceEs> = {
  nav: {
    orders: "Orders",
    products: "Products",
    newOrder: "New order",
    inventory: "Inventory",
    analytics: "Statistics",
    appearance: "Appearance",
    aria: "Main sections",
  },

  title: "Appearance",
  intro:
    "Choose how the panel looks. It applies instantly and is saved to your account, so your phone and your computer match.",
  saveFailed:
    "Could not save to your account. The change stays on this device and is sent again the next time you open the panel.",

  palette: {
    title: "Palette",
    description: (mode) =>
      `Each one has a light side and a dark side. You are looking at the ${
        mode === "dark" ? "dark" : "light"
      } one now; switch it in your user menu, under “Theme”.`,
    aria: "Palettes",
    light: "Light",
    dark: "Dark",
    inUse: "In use",
    previewSales: "Today's sales",
    previewCreate: "Create",
    previewOrders: "Orders",
  },
  palettes: {
    catedral: "Void black and sacred violet. The store, from behind the counter.",
    tokio: "Rain, asphalt and neon signs. For selling at 3 a.m.",
    roatan: "Pale sand, turquoise sea and a coral sunset.",
    copan: "Carved stone, jade and stucco. Books kept with a thousand years of calm.",
    guacamaya: "Red, yellow and blue in full flight. Impossible to miss.",
    lempira: "Black and gold. For the days the till keeps ringing.",
    terminal: "Green phosphor on black. Everything is a command line.",
    chicle: "Bubblegum pink and sky blue. Unapologetically Y2K.",
    cafe: "Dark roast, cream and ripe cherry. Smells like morning.",
    winter: "Ice, steel and zero excuses. October to December you don't go out: you cook.",
    cine: "Black and white with a single red. For the days that play like a movie.",
    clasico: "The panel as it shipped, untouched.",
  },

  type: {
    title: "Typography",
    description: "The typeface of headings and big figures, and the one for the rest of the panel.",
    byPalette: "Match the palette",
    byPaletteTagline: (palette, font) =>
      `The one each palette comes with. With ${palette}: ${font}.`,
  },
  fonts: {
    gotica: { name: "Gothic", tagline: "Cinzel headings, like the store" },
    moderna: { name: "Modern", tagline: "Manrope end to end: clean, with character" },
    atletica: { name: "Athletic", tagline: "Big Shoulders: scoreboard numbers" },
    cyber: { name: "Cyber", tagline: "Unbounded and Space Grotesk: year 2000, version 3000" },
    editorial: { name: "Editorial", tagline: "Instrument Serif: magazine cover" },
    terminal: { name: "Terminal", tagline: "JetBrains Mono everywhere: sales from the console" },
    clasica: { name: "Classic", tagline: "Inter, Medusa's own" },
  },

  language: {
    title: "Language",
    description:
      "The whole panel in Spanish or in English: your sections and the rest of Medusa too.",
    aria: "Panel language",
    names: { es: "Español", en: "English" },
    taglines: { es: "Con voseo, como la tienda", en: "Same panel, in English" },
    mixed:
      "Your sections are in English, but the rest of the panel is still in another language. Tap “English” to make it all match.",
    customers: "Messages to your customers (WhatsApp and emails) still go out in Spanish.",
  },

  larp: {
    title: "Motto and phrases",
    description:
      "Your phrases on Statistics and the voice of the panel. The words are yours; the numbers are always the real ones.",

    openerLabel: "Phrase at the top of Statistics",
    openerHelp:
      "The first thing you see when Statistics opens, before the numbers. Write your own.",
    openerPlaceholder: "Write your phrase",
    openerEmpty: "You haven't written one yet, so nothing is shown.",

    mottoLabel: "Phrase at the end of Statistics (your motto)",
    mottoHelp:
      "Your motto closes the page. It also shows on the sign-in screen and in Photo mode, even if you turn it off here.",
    mottoReset: "Back to the original",

    size: "Size",
    sizes: { sm: "Small", md: "Medium", lg: "Large", xl: "Huge" },
    hidden: "Off: not shown on Statistics.",

    phrasesLabel: "Ticker phrases",
    phrasesHelp:
      "The ones that run on the ticker of Statistics and Photo mode, between the day's figures. Change them, remove the ones that don't sound like you and add your own. They show in capitals, in this order.",
    phraseAria: (position) => `Phrase ${position}`,
    phraseRemove: (position) => `Remove phrase ${position}`,
    phraseBlank: "Empty: not shown",
    phraseNew: "New phrase",
    phraseNewPlaceholder: "Write a phrase",
    phraseAdd: "Add",
    phrasesCount: (count, max) => `${count} of ${max}`,
    phrasesFull: (max) => `You've reached ${max}. Remove one to add another.`,
    phrasesNone: "No phrases: the ticker carries only your motto and the day's figures.",
    phrasesReset: "Back to the originals",
    phrasesPreview: "How it runs, with your motto in front",

    hypeLabel: "Larp mode",
    hypeHelp:
      "The moving phrase ticker, the day's reading and your streak on Statistics. Off, the panel stays sober.",
  },

  details: "Details",
  auraLabel: "Background glow",
  auraOn: "A soft glow in the palette's colors behind the cards.",
  auraOff: "The classic Medusa palette doesn't have one.",
  tabbarLabel: "Bottom bar on phones",
  tabbarHelp:
    "Orders, Products, New order, Inventory and Statistics one tap away, at the bottom of the screen.",
  now: (palette, font) => `Now: ${palette} with ${font} type.`,
  reset: "Reset",
}
