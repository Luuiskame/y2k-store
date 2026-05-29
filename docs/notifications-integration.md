# Notifications Integration — WhatsApp + Email

This document covers how Y2K Fit Honduras will send order-related notifications:

1. **WhatsApp messages** — to the store owner when a customer uploads a bank-transfer proof, and to the customer when their payment is received and when it's verified
2. **Transactional emails** — same triggers as above, plus the standard order confirmation / shipping update flow

The two systems are independent. Pick a WhatsApp option and an email option separately, then plug both into the Medusa `notification` module.

---

## Part 1 — WhatsApp automation

### Options compared

| Option | Cost | Setup difficulty | Production-ready? | Notes |
|---|---|---|---|---|
| **Meta WhatsApp Cloud API** (official, direct) | Free 1,000 user-initiated conversations / month; ~USD $0.04 each after | Medium | ✅ Yes | The official path. Direct from Meta — no middleman markup. Requires Meta Business verification + a WABA + template approvals. **Recommended.** |
| **Twilio WhatsApp Business API** | ~USD $0.005 per message + Meta's per-conversation fee | Easy | ✅ Yes | Same Meta back-end, wrapped in Twilio's nicer SDK and dashboard. Pay a markup for convenience. Good if you already use Twilio for SMS. |
| **360dialog** | ~€5/mo + Meta fees | Easy | ✅ Yes | Another official BSP. EU-friendly billing. |
| **Vonage / MessageBird / WATI** | Varies | Easy | ✅ Yes | More BSP wrappers — same idea as Twilio, slightly different pricing/UX. |
| **`wa.me` click-to-chat** (current behavior) | Free | Trivial | ❌ No automation | What the cart currently uses for the "¿Dudas?" link. Only works when a human clicks a button — cannot send order-triggered messages. |
| **Unofficial libs** (`whatsapp-web.js`, Baileys) | Free | Easy in code | ⛔ **DO NOT USE** | Reverse-engineer WhatsApp Web. Violates WhatsApp ToS. Numbers get banned without warning. Fine for hobby projects, suicide for a real store. |

### Recommended path: Meta WhatsApp Cloud API (direct)

**Why over Twilio:** Twilio adds ~USD $0.005 per message on top of Meta's per-conversation fee. For a Honduran store doing 100–500 orders/month, that markup pays for nothing meaningful — the official API is straightforward to integrate.

**Why over unofficial libs:** Your store's WhatsApp number is also where you talk to customers manually. Losing it to a ban would be catastrophic. Never automate through unofficial channels on a number that matters.

### Setup walkthrough (Meta Cloud API)

1. **Create a Meta Business account** at https://business.facebook.com if you don't have one already.
2. **Set up a WhatsApp Business Account (WABA)**: Business Manager → Business Settings → WhatsApp Accounts → Add.
3. **Add a phone number** to the WABA. This must be a number not already in use on the personal WhatsApp or Business app. You can use the existing store number, but you'll need to delete it from WhatsApp Business app first.
4. **Get credentials** from Meta for Developers (https://developers.facebook.com):
   - App ID
   - WhatsApp Business Account ID
   - Phone Number ID
   - Permanent access token (generate via System User in Business Settings — temporary tokens expire in 24h, don't use them in production)
5. **Submit message templates for approval**. Meta requires pre-approved templates for *business-initiated* messages (which is what we need — order events are business-initiated). User-initiated 24h windows don't apply here.

   Templates needed for the BAC flow (Spanish, transactional category):

   - `bac_proof_received_customer` — sent to customer right after they upload comprobante
   - `bac_payment_verified_customer` — sent to customer after admin confirms
   - `bac_proof_received_owner` — sent to store owner when a new comprobante is uploaded (the owner number is added as a recipient)

   Example template body for `bac_proof_received_customer`:

   ```
   ¡Hola {{1}}! Recibimos tu comprobante de pago para tu pedido #{{2}} en Y2K Fit Honduras.

   Lo estamos verificando y te avisaremos cuando el pago sea confirmado (usualmente en menos de 4 horas hábiles).

   Gracias por tu compra. 🖤
   ```

   Example template body for `bac_payment_verified_customer`:

   ```
   ¡Pago verificado! 🖤 Tu pedido #{{1}} en Y2K Fit Honduras ya está en proceso.

   Te enviaremos otro mensaje cuando despachemos el paquete con tu número de guía.

   Total confirmado: {{2}}
   ```

   Example template body for `bac_proof_received_owner`:

   ```
   Nuevo comprobante BAC recibido.

   Pedido: #{{1}}
   Cliente: {{2}}
   Total: {{3}}

   Verificar en admin: {{4}}
   ```

   Approval typically takes a few hours to a day.

6. **Store the credentials** in `my-medusa-store/.env`:

   ```env
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_ACCESS_TOKEN=...
   WHATSAPP_OWNER_NUMBER=50432564101
   WHATSAPP_API_VERSION=v21.0
   ```

### Medusa notification provider — skeleton

Create `my-medusa-store/src/modules/notification-whatsapp/`:

**`index.ts`**

```ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import WhatsAppNotificationService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [WhatsAppNotificationService],
})
```

**`service.ts`**

```ts
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"

type Options = {
  phoneNumberId: string
  accessToken: string
  apiVersion?: string
}

class WhatsAppNotificationService extends AbstractNotificationProviderService {
  static identifier = "whatsapp"
  protected options_: Options

  constructor(_, options: Options) {
    super()
    this.options_ = options
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { to, template, data } = notification
    const version = this.options_.apiVersion ?? "v21.0"
    const url = `https://graph.facebook.com/${version}/${this.options_.phoneNumberId}/messages`

    // `data` carries the template variable values (e.g. { "1": "Luis", "2": "1234" })
    const components = data?.template_params
      ? [
          {
            type: "body",
            parameters: Object.values(data.template_params as Record<string, string>).map(
              (text) => ({ type: "text", text })
            ),
          },
        ]
      : undefined

    const body = {
      messaging_product: "whatsapp",
      to: to.replace(/[^0-9]/g, ""), // E.164 without leading +
      type: "template",
      template: {
        name: template, // the approved template name, e.g. "bac_proof_received_customer"
        language: { code: (data?.locale as string) ?? "es" },
        ...(components ? { components } : {}),
      },
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `WhatsApp send failed (${res.status}): ${errorText}`
      )
    }

    const json = await res.json()
    return { id: json.messages?.[0]?.id }
  }
}

export default WhatsAppNotificationService
```

Register in `medusa-config.ts` under the notification module:

```ts
{
  resolve: "@medusajs/medusa/notification",
  options: {
    providers: [
      {
        resolve: "./src/modules/notification-whatsapp",
        id: "whatsapp",
        options: {
          channels: ["whatsapp"],
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
          apiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
        },
      },
    ],
  },
}
```

### Sending from a subscriber

```ts
import { Modules } from "@medusajs/framework/utils"

const notificationService = container.resolve(Modules.NOTIFICATION)

await notificationService.createNotifications({
  to: customer.phone, // E.164: 50432564101
  channel: "whatsapp",
  template: "bac_proof_received_customer",
  data: {
    locale: "es",
    template_params: {
      "1": customer.first_name,
      "2": order.display_id,
    },
  },
})
```

---

## Part 2 — Email provider

### Options compared

| Provider | Free tier | DX | Notes |
|---|---|---|---|
| **Resend** | 3,000 emails/mo, 100/day | ★★★★★ | Modern API, React Email templating, best dev experience in 2025. **Recommended.** |
| **Brevo** (ex-Sendinblue) | 300/day | ★★★ | Includes SMS as bonus channel, EU compliance built-in. Heavier UI. |
| **SendGrid** | 100/day | ★★★ | Industry standard. Medusa ships an official `@medusajs/notification-sendgrid` provider — least integration code. Aggressive paid upsell. |
| **Postmark** | 100/mo trial only | ★★★★ | Best transactional deliverability. No real free tier. |
| **Amazon SES** | 62,000/mo from EC2, $0.10/1k otherwise | ★★ | Cheapest at scale. Domain verification + sandbox approval is the most work. |
| **Mailgun** | 100/day for 30 days, then $35/mo | ★★★ | Solid but no permanent free tier anymore. |

### Recommended path: Resend

**Why over SendGrid (despite SendGrid having an official Medusa provider):** Resend's React Email integration lets you build branded transactional emails using React components — perfect for a brand-focused store like Y2K Fit. SendGrid's template builder is dated and you'd fight it to match the dark/gothic aesthetic.

**Why over Brevo:** Brevo is fine, but Resend's API is cleaner and the React Email ecosystem (https://react.email) gives you free, well-designed transactional email templates as a starting point.

### Setup walkthrough (Resend)

1. **Sign up** at https://resend.com and verify your sending domain (e.g. `y2kfithn.com`).
   - Add the DNS records Resend gives you (SPF, DKIM, DMARC) on your domain registrar.
   - Verification typically completes within minutes.
2. **Create an API key** in Resend dashboard → API Keys. Save it.
3. **Store credentials** in `my-medusa-store/.env`:

   ```env
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL="Y2K Fit Honduras <ordenes@y2kfithn.com>"
   ```

4. **Install React Email** (optional but recommended for nice templates):

   ```bash
   npm install @react-email/components @react-email/render
   ```

### Medusa notification provider — skeleton

Create `my-medusa-store/src/modules/notification-resend/`:

**`index.ts`**

```ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ResendNotificationService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationService],
})
```

**`service.ts`**

```ts
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { Resend } from "resend"
import { renderTemplate } from "./templates"

type Options = {
  apiKey: string
  fromEmail: string
}

class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "resend"
  protected client_: Resend
  protected options_: Options

  constructor(_, options: Options) {
    super()
    this.options_ = options
    this.client_ = new Resend(options.apiKey)
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { to, template, data } = notification
    const { subject, html, text } = await renderTemplate(template, data)

    const { data: result, error } = await this.client_.emails.send({
      from: this.options_.fromEmail,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend send failed: ${error.message}`
      )
    }

    return { id: result?.id }
  }
}

export default ResendNotificationService
```

**`templates/index.ts`** — a tiny dispatcher:

```ts
import { bacProofReceivedCustomer } from "./bac-proof-received-customer"
import { bacPaymentVerifiedCustomer } from "./bac-payment-verified-customer"
import { orderConfirmation } from "./order-confirmation"

type Renderer = (data: any) => Promise<{
  subject: string
  html: string
  text: string
}>

const registry: Record<string, Renderer> = {
  "bac-proof-received-customer": bacProofReceivedCustomer,
  "bac-payment-verified-customer": bacPaymentVerifiedCustomer,
  "order-confirmation": orderConfirmation,
}

export async function renderTemplate(name: string, data: any) {
  const renderer = registry[name]
  if (!renderer) throw new Error(`Unknown email template: ${name}`)
  return renderer(data)
}
```

Each template file exports an async function that returns `{ subject, html, text }`. With React Email:

```tsx
// templates/bac-proof-received-customer.tsx
import { render } from "@react-email/render"
import { Html, Body, Container, Heading, Text, Hr } from "@react-email/components"

export async function bacProofReceivedCustomer(data: {
  first_name: string
  order_display_id: string | number
}) {
  const html = await render(
    <Html>
      <Body style={{ background: "#0a0612", color: "#e9e6f0", fontFamily: "sans-serif" }}>
        <Container style={{ padding: "24px" }}>
          <Heading style={{ color: "#c084fc" }}>
            Recibimos tu comprobante
          </Heading>
          <Text>
            Hola {data.first_name}, recibimos el comprobante de tu pedido #
            {data.order_display_id}. Lo estamos verificando y te avisaremos
            apenas el pago sea confirmado.
          </Text>
          <Hr />
          <Text style={{ fontSize: "12px", opacity: 0.7 }}>
            Y2K Fit Honduras · y2kfithn.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
  const text =
    `Hola ${data.first_name}, recibimos el comprobante de tu pedido #${data.order_display_id}. ` +
    `Lo estamos verificando y te avisaremos apenas el pago sea confirmado.`

  return {
    subject: `Recibimos tu comprobante — Pedido #${data.order_display_id}`,
    html,
    text,
  }
}
```

Register in `medusa-config.ts`:

```ts
{
  resolve: "@medusajs/medusa/notification",
  options: {
    providers: [
      {
        resolve: "./src/modules/notification-whatsapp",
        id: "whatsapp",
        options: {
          channels: ["whatsapp"],
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        },
      },
      {
        resolve: "./src/modules/notification-resend",
        id: "resend",
        options: {
          channels: ["email"],
          apiKey: process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_FROM_EMAIL,
        },
      },
    ],
  },
}
```

### Sending from a subscriber

```ts
await notificationService.createNotifications([
  {
    to: customer.email,
    channel: "email",
    template: "bac-proof-received-customer",
    data: {
      first_name: customer.first_name,
      order_display_id: order.display_id,
    },
  },
  {
    to: customer.phone,
    channel: "whatsapp",
    template: "bac_proof_received_customer",
    data: {
      locale: "es",
      template_params: {
        "1": customer.first_name,
        "2": String(order.display_id),
      },
    },
  },
])
```

---

## Triggering events (the glue)

These are the events the BAC flow emits. Subscribers listen for them and dispatch the notifications above.

| Event | Emitted by | Sends |
|---|---|---|
| `bac_transfer.proof_uploaded` | `POST /store/orders/:id/bac-proof` route | Owner WhatsApp + customer "recibido" WhatsApp + customer "recibido" email |
| `order.payment_captured` (filtered to BAC provider) | Admin clicks "Confirmar pago" widget button | Customer "verificado" WhatsApp + customer "verificado" email |

Subscriber file locations (Medusa convention):

- `my-medusa-store/src/subscribers/bac-proof-uploaded.ts`
- `my-medusa-store/src/subscribers/bac-payment-confirmed.ts`

---

## Cost estimate for launch

Assuming **200 orders/month**, of which ~70% use BAC transfer (140 orders):

- WhatsApp: 140 owner messages + 280 customer messages = 420 conversations/month → within Meta's 1,000-free tier → **USD $0**
- Email: 200 order confirmations + 140 BAC "recibido" + 140 BAC "verificado" + ~200 shipping updates = ~680 emails/month → within Resend's 3,000-free tier → **USD $0**

You can comfortably reach **~10x current order volume** before hitting the paid tier on either service.

---

## Migration / rollback notes

- If a notification provider goes down, the subscriber should log + continue (don't fail the order capture). Wrap `createNotifications` in try/catch and log via Medusa's logger so the store keeps working.
- All notification IDs returned by the providers are persisted by Medusa's notification module — you can query delivery history per order from the admin.
- Switching email providers later (e.g. Resend → SendGrid) is a single-file swap (`notification-resend/service.ts` → `notification-sendgrid/service.ts`) because the subscribers only depend on `channel: "email"` + `template`, not the underlying provider.
