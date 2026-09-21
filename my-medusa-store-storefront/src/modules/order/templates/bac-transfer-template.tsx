import { Heading } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"

import CartTotals from "@modules/common/components/cart-totals"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import BacAccountCard from "@modules/order/components/bac-account-card"
import BacHelpButton from "@modules/order/components/bac-help-button"
import BacProofUploader from "@modules/order/components/bac-proof-uploader"
import PurchaseTracker from "@modules/order/components/purchase-tracker"
import { getBacTransferProof } from "@modules/order/util/bac-transfer"
import { BAC_ACCOUNT } from "@lib/config/bac-account"
import {
  MAX_FILES_PER_REQUEST,
  MAX_PROOFS_PER_ORDER,
} from "@lib/config/bac-proof"

type Props = {
  order: HttpTypes.StoreOrder
}

export default function BacTransferTemplate({ order }: Props) {
  const existingProof = getBacTransferProof(order)
  const hasUploaded = existingProof.length > 0

  return (
    <div className="py-10 min-h-[calc(100vh-64px)]">
      <PurchaseTracker order={order} />
      <div className="content-container flex flex-col gap-y-8 max-w-4xl w-full mx-auto">
        <div
          className="rounded-large p-6 small:p-8 flex flex-col gap-y-3"
          style={{
            background: "var(--brand-abyss-purple)",
            border: "1px solid var(--brand-amethyst)",
          }}
        >
          <span
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--brand-divine-lilac)" }}
          >
            Pedido reservado · Esperando transferencia
          </span>
          <Heading
            level="h1"
            className="font-heading text-3xl small:text-4xl"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            Casi listo. Solo falta tu transferencia.
          </Heading>
          <p
            className="font-body text-sm small:text-base"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            Reservamos tu pedido <strong>#{order.display_id}</strong> por 24
            horas. Sigue los tres pasos abajo y te confirmamos por correo en
            menos de 4 horas hábiles tras recibir tu comprobante.
          </p>
        </div>

        <div
          className="rounded-large p-6 small:p-8"
          style={{
            background: "var(--brand-abyss-purple)",
            border: "1px solid var(--brand-amethyst)",
          }}
        >
          <Heading
            level="h2"
            className="font-heading text-xl small:text-2xl mb-4"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            1. Transfiere el total
          </Heading>
          <BacAccountCard account={BAC_ACCOUNT} totalLabel={undefined} order={order} />
        </div>

        <div
          className="rounded-large p-6 small:p-8"
          style={{
            background: "var(--brand-abyss-purple)",
            border: "1px solid var(--brand-amethyst)",
          }}
        >
          <Heading
            level="h2"
            className="font-heading text-xl small:text-2xl mb-2"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            2. Sube tu comprobante
          </Heading>
          <p
            className="font-body text-sm mb-4"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            Captura de pantalla o PDF del comprobante de transferencia. Puedes
            subir hasta {MAX_FILES_PER_REQUEST} archivos a la vez, y un máximo
            de {MAX_PROOFS_PER_ORDER} en total para este pedido.
          </p>
          <BacProofUploader
            orderId={order.id}
            initialProof={existingProof}
            hasUploaded={hasUploaded}
          />
        </div>

        <div
          className="rounded-large p-6 small:p-8 flex flex-col gap-y-2"
          style={{
            background: "var(--brand-abyss-purple)",
            border: "1px solid var(--brand-amethyst)",
          }}
        >
          <Heading
            level="h2"
            className="font-heading text-xl small:text-2xl"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            3. Te confirmamos por correo
          </Heading>
          <p
            className="font-body text-sm"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            Recibirás un correo apenas tu comprobante llegue, y otro cuando
            verifiquemos el pago. Después de eso preparamos tu pedido para
            enviarlo.
          </p>
          <div className="mt-3">
            <BacHelpButton order={order} />
          </div>
        </div>

        <div
          className="rounded-large p-6 small:p-8"
          style={{
            background: "var(--brand-abyss-purple)",
            border: "1px solid var(--brand-amethyst)",
          }}
        >
          <Heading
            level="h2"
            className="font-heading text-xl small:text-2xl mb-4"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            Resumen del pedido
          </Heading>
          <OrderDetails order={order} />
          <div className="mt-6">
            <Items order={order} />
          </div>
          <div className="mt-6">
            <CartTotals totals={order} />
          </div>
          <div className="mt-6">
            <ShippingDetails order={order} />
          </div>
        </div>
      </div>
    </div>
  )
}
