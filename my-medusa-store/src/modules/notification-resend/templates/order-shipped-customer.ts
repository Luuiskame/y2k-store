import { layout } from "./layout"
import type { RenderedEmail } from "./index"

type Data = {
  first_name?: string
  order_display_id: string | number
  tracking_numbers?: string[]
  tracking_url?: string
}

export function orderShippedCustomer(data: Data): RenderedEmail {
  const greeting = data.first_name ? `Hola ${data.first_name}` : "Hola"
  const subject = `Tu pedido #${data.order_display_id} va en camino 🖤`
  const tracking = data.tracking_numbers?.filter(Boolean) ?? []

  const trackingBlock = tracking.length
    ? `
    <p style="margin:0 0 16px;">
      ${tracking.length === 1 ? "Número de guía" : "Números de guía"}:
      <strong style="color:#c084fc;">${tracking.join(", ")}</strong>
    </p>
    ${
      data.tracking_url
        ? `<p style="margin:0 0 16px;">
             <a href="${data.tracking_url}" style="color:#c084fc;">Rastrear envío</a>
           </p>`
        : ""
    }`
    : ""

  const html = layout(
    `
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#c084fc;margin:0 0 12px;">
      Tu pedido va en camino
    </h1>
    <p style="margin:0 0 16px;">
      ${greeting}, despachamos tu pedido
      <strong style="color:#c084fc;">#${data.order_display_id}</strong>.
      Ya está en ruta hacia vos.
    </p>
    ${trackingBlock}
    <p style="margin:0;color:#9b8fb5;font-size:13px;">
      Gracias por confiar en Y2K Fit Honduras.
    </p>
    `,
    `Tu pedido #${data.order_display_id} va en camino.`
  )

  const text =
    `${greeting}, despachamos tu pedido #${data.order_display_id}. Ya está en ruta hacia vos.` +
    (tracking.length ? ` Guía: ${tracking.join(", ")}.` : "") +
    (data.tracking_url ? ` Rastrea aquí: ${data.tracking_url}` : "")

  return { subject, html, text }
}
