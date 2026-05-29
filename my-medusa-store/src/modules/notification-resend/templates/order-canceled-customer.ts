import { layout } from "./layout"
import type { RenderedEmail } from "./index"

type Data = {
  first_name?: string
  order_display_id: string | number
}

const WHATSAPP_NUMBER = "87466059"
const WHATSAPP_DISPLAY = "+504 8746-6059"
const WHATSAPP_LINK = "https://wa.me/504" + WHATSAPP_NUMBER

export function orderCanceledCustomer(data: Data): RenderedEmail {
  const greeting = data.first_name ? `Hola ${data.first_name}` : "Hola"
  const subject = `Tu pedido #${data.order_display_id} fue cancelado`

  const refundBlock = `
    <p style="margin:0 0 16px;">
      Si ya realizaste el pago, coordinaremos el reembolso contigo. Escribinos por WhatsApp al
      <a href="${WHATSAPP_LINK}" style="color:#c084fc;">${WHATSAPP_DISPLAY}</a>
      para darte seguimiento.
    </p>`

  const html = layout(
    `
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#c084fc;margin:0 0 12px;">
      Pedido cancelado
    </h1>
    <p style="margin:0 0 16px;">
      ${greeting}, tu pedido
      <strong style="color:#c084fc;">#${data.order_display_id}</strong>
      fue cancelado.
    </p>
    ${refundBlock}
    <p style="margin:0;color:#9b8fb5;font-size:13px;">
      ¿Fue un error o tenés dudas? Escribinos por WhatsApp al
      <a href="${WHATSAPP_LINK}" style="color:#c084fc;">${WHATSAPP_DISPLAY}</a>
      y te ayudamos. — Y2K Fit Honduras.
    </p>
    `,
    `Tu pedido #${data.order_display_id} fue cancelado.`
  )

  const text =
    `${greeting}, tu pedido #${data.order_display_id} fue cancelado. ` +
    `Si ya realizaste el pago, coordinaremos el reembolso contigo. ` +
    `Escribinos por WhatsApp al ${WHATSAPP_DISPLAY} (${WHATSAPP_LINK}).`

  return { subject, html, text }
}
