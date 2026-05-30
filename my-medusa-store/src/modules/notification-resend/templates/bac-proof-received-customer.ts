import { layout } from "./layout"
import type { RenderedEmail } from "./index"

type Data = {
  first_name?: string
  order_display_id: string | number
  total_label?: string
}

export function bacProofReceivedCustomer(data: Data): RenderedEmail {
  const greeting = data.first_name ? `Hola ${data.first_name}` : "Hola"
  const subject = `Recibimos tu comprobante — Pedido #${data.order_display_id}`

  const html = layout(
    `
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#c084fc;margin:0 0 12px;">
      Recibimos tu comprobante
    </h1>
    <p style="margin:0 0 16px;">
      ${greeting}, gracias por tu compra en Y2K Fit Honduras.
    </p>
    <p style="margin:0 0 16px;">
      Recibimos el comprobante de transferencia para tu pedido
      <strong style="color:#c084fc;">#${data.order_display_id}</strong>
      ${data.total_label ? `por <strong>${data.total_label}</strong>` : ""}.
    </p>
    <p style="margin:0 0 16px;">
      Lo estamos verificando con el banco y te enviaremos otro correo apenas el
      pago sea confirmado (usualmente en menos de 4 horas hábiles).
    </p>
    <p style="margin:0;color:#9b8fb5;font-size:13px;">
      Si tienes alguna duda mientras tanto, respóndenos a este correo.
    </p>
    `,
    `Tu comprobante de transferencia llegó. Lo estamos verificando.`
  )

  const text =
    `${greeting}, recibimos el comprobante de tu pedido #${data.order_display_id}` +
    `${data.total_label ? ` por ${data.total_label}` : ""}. ` +
    `Lo estamos verificando y te avisaremos apenas el pago sea confirmado ` +
    `(usualmente en menos de 4 horas hábiles).`

  return { subject, html, text }
}
