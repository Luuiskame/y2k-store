import { layout } from "./layout"
import type { RenderedEmail } from "./index"

type Data = {
  first_name?: string
  order_display_id: string | number
}

export function orderDeliveredCustomer(data: Data): RenderedEmail {
  const greeting = data.first_name ? `Hola ${data.first_name}` : "Hola"
  const subject = `Tu pedido #${data.order_display_id} fue entregado`

  const html = layout(
    `
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#c084fc;margin:0 0 12px;">
      Pedido entregado 🖤
    </h1>
    <p style="margin:0 0 16px;">
      ${greeting}, tu pedido
      <strong style="color:#c084fc;">#${data.order_display_id}</strong>
      fue entregado. Esperamos que lo disfrutes.
    </p>
    <p style="margin:0 0 16px;">
      Si algo no salió como esperabas, respondé a este correo y lo resolvemos.
    </p>
    <p style="margin:0;color:#9b8fb5;font-size:13px;">
      Etiquétanos para aparecer en nuestras redes. — Y2K Fit Honduras.
    </p>
    `,
    `Tu pedido #${data.order_display_id} fue entregado.`
  )

  const text =
    `${greeting}, tu pedido #${data.order_display_id} fue entregado. ` +
    `Esperamos que lo disfrutes. Si algo no salió como esperabas, respondé a este correo.`

  return { subject, html, text }
}
