import type { Words } from "./words"

/**
 * Sales alerts (the banner on the orders list and the card in Profile) and
 * the BAC transfer receipts card on an order.
 */

export const alertsEs = {
  dismissedHint: "Puedes activarlas cuando quieras en Ajustes → Perfil.",
  installSteps:
    "En Safari toca Compartir y elige «Agregar a pantalla de inicio». Luego abre el panel desde el ícono Y2K Admin y activa las alertas ahí.",
  installTitle: (device: string) => `Recibe las alertas de ventas en este ${device}`,
  installDescription: (device: string, steps: string) =>
    `El ${device} solo avisa desde la app de inicio. ${steps}`,
  understood: "Entendido",
  bannerTitle: "Alertas de ventas en este dispositivo",
  bannerDescription:
    "Te avisamos al momento cada vez que entra un pedido o un cliente sube el comprobante de su transferencia.",
  notNow: "Ahora no",
  enable: "Activar alertas",

  states: {
    on: "Activas",
    off: "Desactivadas",
    blocked: "Bloqueadas",
    "needs-install": "Falta instalar",
    unsupported: "No disponibles",
  } as Record<string, string>,
  describe: {
    checking: "Revisando este dispositivo…",
    on: "Este dispositivo recibe un aviso por cada pedido nuevo y cada comprobante.",
    off: "Este dispositivo no recibe avisos.",
    blocked:
      "Las notificaciones del panel están bloqueadas. Actívalas en los ajustes del dispositivo (en iPhone: Ajustes → Notificaciones → Y2K Admin) y vuelve a esta página.",
    needsInstall: (device: string, steps: string) =>
      `En ${device} los avisos solo llegan a la app de inicio. ${steps}`,
    unsupported: "Este navegador no puede recibir notificaciones del panel.",
  },

  title: "Alertas de ventas",
  description:
    "Un aviso en tus dispositivos por cada pedido nuevo y cada comprobante de transferencia. Los comprobantes también llegan por correo.",
  sendTest: "Enviar prueba",
  loading: "Cargando…",
  loadError: "No se pudo cargar el estado de las alertas.",
  notConfigured:
    "El servidor todavía no puede enviar alertas: faltan las variables WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY y WEB_PUSH_SUBJECT.",
  thisDevice: "Este dispositivo",
  disable: "Desactivar",
  devices: "Dispositivos con alertas",
  reactivate: "Hay que volver a activarlas",
  since: (date: string) => `Desde el ${date}`,
  remove: "Quitar",

  noManifest: "Falta el manifest de la app en esta página.",
  notReady: "Las alertas todavía no están listas en este dispositivo.",
  blockedHere: "Las notificaciones del panel están bloqueadas en este dispositivo.",
  onButSampleFailed: "Alertas activadas, pero la prueba no se pudo enviar.",
  retrySample: "Vuelve a intentarlo con «Enviar prueba» en Ajustes → Perfil.",
  onButSampleMissed: "Alertas activadas, pero la prueba no llegó a ningún dispositivo.",
  onWithSample: "Alertas activadas. Te enviamos una de prueba.",
  enableFailed: "No se pudieron activar las alertas.",
  disabled: "Alertas desactivadas en este dispositivo.",
  disableFailed: "No se pudieron desactivar las alertas.",
  sampleMissed: "Ningún dispositivo recibió la alerta de prueba.",
  sampleSent: (devices: number) =>
    devices === 1
      ? "Alerta de prueba enviada."
      : `Alerta de prueba enviada a ${devices} dispositivos.`,
  sampleFailed: "No se pudo enviar la alerta de prueba.",
  deviceRemoved: "Dispositivo quitado.",
  removeFailed: "No se pudo quitar el dispositivo.",

  /** The receipts card on an order paid by BAC transfer. */
  bac: {
    title: "Transferencia BAC",
    verified: "Pago verificado",
    proofPending: "Comprobante pendiente",
    noProof: "Sin comprobante",
    nothingUploaded: "Aún no se ha subido comprobante de transferencia.",
    filesReceived: (count: number) =>
      `${count} ${count === 1 ? "archivo recibido" : "archivos recibidos"}`,
    loadingProofs: "Cargando comprobantes…",
    proofsFailed: "No se pudieron cargar los comprobantes.",
    proofAlt: (index: number) => `Comprobante ${index}`,
    fileMissing: (index: number) => `Comprobante ${index}: no se encontró el archivo`,
    showMore: (next: number, left: number) => `Ver ${next} más (${left} restantes)`,
    confirm: "Confirmar pago",
    confirmFailed: "No se pudo confirmar el pago.",
    confirmError: "Error al confirmar el pago.",
    confirmed: "Pago confirmado. Notificando al cliente.",
    customerNotified: "El cliente ya fue notificado por correo.",
  },
}

export const alertsEn: Words<typeof alertsEs> = {
  dismissedHint: "You can turn them on whenever you like in Settings → Profile.",
  installSteps:
    "In Safari tap Share and choose “Add to Home Screen”. Then open the panel from the Y2K Admin icon and turn the alerts on there.",
  installTitle: (device) => `Get sales alerts on this ${device}`,
  installDescription: (device, steps) =>
    `The ${device} only notifies from the Home Screen app. ${steps}`,
  understood: "Got it",
  bannerTitle: "Sales alerts on this device",
  bannerDescription:
    "We let you know the moment an order comes in or a customer uploads their transfer receipt.",
  notNow: "Not now",
  enable: "Turn on alerts",

  states: {
    on: "On",
    off: "Off",
    blocked: "Blocked",
    "needs-install": "Needs installing",
    unsupported: "Not available",
  },
  describe: {
    checking: "Checking this device…",
    on: "This device gets a notification for every new order and every receipt.",
    off: "This device gets no notifications.",
    blocked:
      "The panel's notifications are blocked. Turn them on in the device's settings (on iPhone: Settings → Notifications → Y2K Admin) and come back to this page.",
    needsInstall: (device, steps) =>
      `On ${device}, notifications only reach the Home Screen app. ${steps}`,
    unsupported: "This browser cannot receive the panel's notifications.",
  },

  title: "Sales alerts",
  description:
    "A notification on your devices for every new order and every transfer receipt. Receipts also arrive by email.",
  sendTest: "Send a test",
  loading: "Loading…",
  loadError: "Could not load the state of the alerts.",
  notConfigured:
    "The server cannot send alerts yet: the variables WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY and WEB_PUSH_SUBJECT are missing.",
  thisDevice: "This device",
  disable: "Turn off",
  devices: "Devices with alerts",
  reactivate: "Needs turning on again",
  since: (date) => `Since ${date}`,
  remove: "Remove",

  noManifest: "The app's manifest is missing on this page.",
  notReady: "Alerts are not ready on this device yet.",
  blockedHere: "The panel's notifications are blocked on this device.",
  onButSampleFailed: "Alerts are on, but the test could not be sent.",
  retrySample: "Try again with “Send a test” in Settings → Profile.",
  onButSampleMissed: "Alerts are on, but the test reached no device.",
  onWithSample: "Alerts are on. We sent you a test one.",
  enableFailed: "Could not turn on the alerts.",
  disabled: "Alerts turned off on this device.",
  disableFailed: "Could not turn off the alerts.",
  sampleMissed: "No device received the test alert.",
  sampleSent: (devices) =>
    devices === 1 ? "Test alert sent." : `Test alert sent to ${devices} devices.`,
  sampleFailed: "Could not send the test alert.",
  deviceRemoved: "Device removed.",
  removeFailed: "Could not remove the device.",

  bac: {
    title: "BAC transfer",
    verified: "Payment verified",
    proofPending: "Receipt pending",
    noProof: "No receipt",
    nothingUploaded: "No transfer receipt has been uploaded yet.",
    filesReceived: (count) => `${count} ${count === 1 ? "file received" : "files received"}`,
    loadingProofs: "Loading receipts…",
    proofsFailed: "Could not load the receipts.",
    proofAlt: (index) => `Receipt ${index}`,
    fileMissing: (index) => `Receipt ${index}: the file was not found`,
    showMore: (next, left) => `Show ${next} more (${left} left)`,
    confirm: "Confirm payment",
    confirmFailed: "Could not confirm the payment.",
    confirmError: "Error confirming the payment.",
    confirmed: "Payment confirmed. Notifying the customer.",
    customerNotified: "The customer has been notified by email.",
  },
}
