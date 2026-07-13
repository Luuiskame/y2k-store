import { layout } from "./layout"
import type { RenderedEmail } from "./index"

type Data = {
  first_name?: string
  reset_url: string
}

export function passwordResetCustomer(data: Data): RenderedEmail {
  const greeting = data.first_name ? `Hola ${data.first_name}` : "Hola"
  const subject = "Restablece tu contraseña · Y2K Fit Honduras 🖤"

  const html = layout(
    `
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#c084fc;margin:0 0 12px;">
      Restablece tu contraseña
    </h1>
    <p style="margin:0 0 16px;">
      ${greeting}, recibimos una solicitud para restablecer la contraseña de tu
      cuenta. Toca el botón para crear una nueva.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${data.reset_url}"
         style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">
        Restablecer contraseña
      </a>
    </p>
    <p style="margin:0 0 16px;color:#9b8fb5;font-size:13px;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
      <br />
      <a href="${data.reset_url}" style="color:#c084fc;word-break:break-all;">${data.reset_url}</a>
    </p>
    <p style="margin:0 0 8px;color:#9b8fb5;font-size:13px;">
      Este enlace expira en 15 minutos.
    </p>
    <p style="margin:0;color:#9b8fb5;font-size:13px;">
      Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña
      seguirá siendo la misma.
    </p>
    `,
    "Restablece la contraseña de tu cuenta Y2K Fit Honduras."
  )

  const text =
    `${greeting}, recibimos una solicitud para restablecer la contraseña de tu cuenta Y2K Fit Honduras. ` +
    `Abre este enlace para crear una nueva contraseña (expira en 15 minutos): ${data.reset_url}. ` +
    `Si no solicitaste este cambio, ignora este correo.`

  return { subject, html, text }
}
