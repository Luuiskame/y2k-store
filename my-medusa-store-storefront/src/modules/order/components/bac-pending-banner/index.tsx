"use client"

import { BAC_ACCOUNT } from "@lib/config/bac-account"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Modal from "@modules/common/components/modal"
import X from "@modules/common/icons/x"
import BacAccountCard from "@modules/order/components/bac-account-card"
import BacHelpButton from "@modules/order/components/bac-help-button"
import BacProofUploader from "@modules/order/components/bac-proof-uploader"
import {
  getBacTransferProof,
  getBacTransferStatus,
} from "@modules/order/util/bac-transfer"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

type Props = {
  order: HttpTypes.StoreOrder
}

const dismissKey = (orderId: string) => `bac_reminder_dismissed_${orderId}`

/**
 * Floating reminder for an order that was placed with "transferencia BAC" but
 * still has no verified payment. Rendered on every page of the main layout so a
 * customer who closed the browser mid-transfer always finds their way back to
 * the bank details, the upload form and WhatsApp help — without having to dig
 * up the order URL.
 */
const BacPendingBanner = ({ order }: Props) => {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const status = getBacTransferStatus(order)
  const proof = getBacTransferProof(order)
  const awaitingProof = status !== "proof_uploaded"

  const total = convertToLocale({
    amount: order.total ?? 0,
    currency_code: order.currency_code ?? "hnl",
  })

  // sessionStorage on purpose: closing the reminder hides it for this visit,
  // but it comes back on the next one — which is exactly the case we're solving
  // (the customer left before transferring). Read after mount so the server and
  // client markup match.
  useEffect(() => {
    try {
      setVisible(!sessionStorage.getItem(dismissKey(order.id)))
    } catch {
      setVisible(true)
    }
  }, [order.id])

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(order.id), "1")
    } catch {
      /* storage unavailable (private mode) — hiding for this render is enough */
    }
    setVisible(false)
  }

  // The dedicated transfer page already shows everything this reminder offers.
  if (pathname?.includes(`/order/${order.id}/transferencia-bac`)) {
    return null
  }

  if (!visible) {
    return null
  }

  return (
    <>
      <div
        className="fixed z-40 bottom-4 inset-x-4 small:inset-x-auto small:left-5 small:bottom-5 small:max-w-md"
        data-testid="bac-pending-banner"
      >
        <div
          className="relative rounded-large p-4 small:p-5 flex flex-col gap-y-3"
          style={{
            background: "var(--brand-abyss-purple)",
            border: "1px solid var(--brand-amethyst)",
            boxShadow: "0 0 32px rgba(155, 77, 202, 0.35)",
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Ocultar recordatorio"
            className="absolute top-2.5 right-2.5 opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: "var(--brand-silver-ash)" }}
            data-testid="dismiss-bac-reminder"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-x-2 pr-6">
            <span className="relative flex h-2 w-2 shrink-0">
              {awaitingProof && (
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "var(--brand-divine-lilac)" }}
                />
              )}
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: "var(--brand-divine-lilac)" }}
              />
            </span>
            <span
              className="text-[11px] uppercase tracking-[0.2em] font-body"
              style={{ color: "var(--brand-divine-lilac)" }}
            >
              {awaitingProof
                ? "Comprobante pendiente"
                : "Comprobante en revisión"}
            </span>
          </div>

          <p
            className="font-heading text-base small:text-lg"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            {awaitingProof
              ? `Tu pedido #${order.display_id} espera tu transferencia`
              : `Estamos verificando el pago de tu pedido #${order.display_id}`}
          </p>

          <p
            className="font-body text-xs small:text-sm"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            {awaitingProof
              ? `Transfiere ${total} a nuestra cuenta BAC y sube tu comprobante aquí mismo.`
              : "Recibimos tu comprobante. Puedes revisarlo o subir otro archivo si algo salió mal."}
          </p>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="btn-glow w-full text-center text-xs small:text-sm"
            data-testid="open-bac-reminder"
          >
            {awaitingProof
              ? "Ver datos y subir comprobante"
              : "Ver mi comprobante"}
          </button>
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        close={() => setIsOpen(false)}
        size="medium"
        data-testid="bac-pending-modal"
      >
        <Modal.Title>
          <span
            className="font-heading"
            style={{ color: "var(--brand-ghost-white)" }}
          >
            Pedido #{order.display_id} · Transferencia BAC
          </span>
        </Modal.Title>

        <div className="flex flex-col gap-y-6 mt-4 overflow-y-auto pr-1">
          <section className="flex flex-col gap-y-3">
            <h3
              className="font-heading text-base"
              style={{ color: "var(--brand-ghost-white)" }}
            >
              1. Transfiere {total}
            </h3>
            <BacAccountCard account={BAC_ACCOUNT} order={order} />
          </section>

          <section className="flex flex-col gap-y-3">
            <h3
              className="font-heading text-base"
              style={{ color: "var(--brand-ghost-white)" }}
            >
              2. Sube tu comprobante
            </h3>
            <BacProofUploader
              orderId={order.id}
              initialProof={proof}
              hasUploaded={proof.length > 0}
            />
          </section>

          <div
            className="flex flex-col gap-y-3 pt-4"
            style={{ borderTop: "1px solid var(--brand-amethyst)" }}
          >
            <BacHelpButton order={order} />
            <LocalizedClientLink
              href={`/order/${order.id}/transferencia-bac`}
              onClick={() => setIsOpen(false)}
              className="text-xs font-body text-center underline-offset-2 hover:underline"
              style={{ color: "var(--brand-divine-lilac)" }}
              data-testid="bac-reminder-full-page-link"
            >
              Ver la página completa del pedido
            </LocalizedClientLink>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default BacPendingBanner
