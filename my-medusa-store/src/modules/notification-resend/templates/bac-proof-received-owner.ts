import { layout } from "./layout"
import type { RenderedEmail } from "./index"

type Data = {
  order_id: string
  order_display_id: string | number
  customer_name?: string
  customer_email?: string
  total_label?: string
  admin_url?: string
  proof_urls?: string[]
}

export function bacProofReceivedOwner(data: Data): RenderedEmail {
  const subject = `🔔 Nuevo comprobante BAC — Pedido #${data.order_display_id}`

  const proofList =
    data.proof_urls && data.proof_urls.length
      ? `<ul style="margin:0 0 16px;padding-left:18px;color:#e9e6f0;">${data.proof_urls
          .map(
            (u) =>
              `<li><a href="${u}" style="color:#c084fc;">${u.split("/").pop()}</a></li>`
          )
          .join("")}</ul>`
      : ""

  const adminCta = data.admin_url
    ? `<p style="margin:24px 0 0;">
         <a href="${data.admin_url}" style="display:inline-block;padding:12px 20px;background:#9b4dca;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;">
           Abrir pedido en admin
         </a>
       </p>`
    : ""

  const html = layout(
    `
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#c084fc;margin:0 0 12px;">
      Nuevo comprobante de transferencia
    </h1>
    <p style="margin:0 0 16px;">
      Un cliente subió su comprobante. Verifícalo en BAC y confirma el pago en
      el admin.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px;">
      <tr><td style="padding:4px 12px 4px 0;color:#9b8fb5;">Pedido</td><td>#${data.order_display_id}</td></tr>
      ${data.customer_name ? `<tr><td style="padding:4px 12px 4px 0;color:#9b8fb5;">Cliente</td><td>${data.customer_name}</td></tr>` : ""}
      ${data.customer_email ? `<tr><td style="padding:4px 12px 4px 0;color:#9b8fb5;">Correo</td><td>${data.customer_email}</td></tr>` : ""}
      ${data.total_label ? `<tr><td style="padding:4px 12px 4px 0;color:#9b8fb5;">Total</td><td><strong>${data.total_label}</strong></td></tr>` : ""}
    </table>
    ${proofList}
    ${adminCta}
    `,
    `Verifica este comprobante y confirma el pago en el admin.`
  )

  const text =
    `Nuevo comprobante BAC.\n` +
    `Pedido: #${data.order_display_id}\n` +
    (data.customer_name ? `Cliente: ${data.customer_name}\n` : "") +
    (data.customer_email ? `Correo: ${data.customer_email}\n` : "") +
    (data.total_label ? `Total: ${data.total_label}\n` : "") +
    (data.admin_url ? `\nVer en admin: ${data.admin_url}\n` : "") +
    (data.proof_urls?.length ? `\nArchivos:\n${data.proof_urls.join("\n")}` : "")

  return { subject, html, text }
}
