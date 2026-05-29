export function layout(content: string, preheader?: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Y2K Fit Honduras</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0612;color:#e9e6f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#0a0612;">${preheader}</div>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0612;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#1a0f2e;border:1px solid #4a2c6e;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #4a2c6e;">
                <div style="font-family:Georgia,serif;font-size:18px;letter-spacing:2px;color:#c084fc;text-transform:uppercase;">
                  Y2K Fit Honduras
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#e9e6f0;font-size:15px;line-height:1.55;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #4a2c6e;color:#9b8fb5;font-size:12px;">
                Y2K Fit Honduras &middot; San Pedro Sula, Honduras
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
