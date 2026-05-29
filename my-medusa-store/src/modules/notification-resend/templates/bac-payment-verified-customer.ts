import { layout } from "./layout"
import type { RenderedEmail } from "./index"

type Data = {
  first_name?: string
  order_display_id: string | number
  total_label?: string
}

export function bacPaymentVerifiedCustomer(data: Data): RenderedEmail {
  const greeting = data.first_name ? `Hola ${data.first_name}` : "Hola"
  const subject = `¡Pago verificado! Pedido #${data.order_display_id} confirmado`

  const html = layout(
    `
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#c084fc;margin:0 0 12px;">
      Pago verificado 🖤
    </h1>
    <p style="margin:0 0 16px;">
      ${greeting}, confirmamos tu transferencia para el pedido
      <strong style="color:#c084fc;">#${data.order_display_id}</strong>
      ${data.total_label ? `por <strong>${data.total_label}</strong>` : ""}.
    </p>
    <p style="margin:0 0 16px;">
      Tu pedido ya entró en preparación. Te enviaremos otro correo con el
      número de guía apenas despachemos el paquete.
    </p>
    <p style="margin:0;color:#9b8fb5;font-size:13px;">
      Gracias por confiar en Y2K Fit Honduras.
    </p>
    `,
    `Tu pago fue verificado. Pedido en preparación.`
  )

  const text =
    `${greeting}, confirmamos tu transferencia para el pedido #${data.order_display_id}` +
    `${data.total_label ? ` por ${data.total_label}` : ""}. ` +
    `Tu pedido ya entró en preparación. Te enviaremos otro correo con el número ` +
    `de guía apenas lo despachemos.`

  return { subject, html, text }
}
