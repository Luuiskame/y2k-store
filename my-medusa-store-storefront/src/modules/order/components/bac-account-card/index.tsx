"use client"

import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useState } from "react"

type Account = {
  bankName: string
  holderName: string
  accountNumber: string
  accountType: string
  currency: string
}

type Props = {
  account: Account
  order: HttpTypes.StoreOrder
  totalLabel?: string
}

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-body underline-offset-2 hover:underline transition-opacity"
      style={{ color: "var(--brand-divine-lilac)" }}
    >
      {copied ? "¡Copiado!" : "Copiar"}
    </button>
  )
}

const Row = ({
  label,
  value,
  copyable,
}: {
  label: string
  value: string
  copyable?: boolean
}) => (
  <div className="flex items-center justify-between gap-x-3 py-2 border-b border-brand-amethyst/30 last:border-b-0">
    <span
      className="text-xs uppercase tracking-wider font-body"
      style={{ color: "var(--brand-silver-ash)" }}
    >
      {label}
    </span>
    <div className="flex items-center gap-x-3 min-w-0">
      <span
        className="font-body text-sm small:text-base text-right truncate"
        style={{ color: "var(--brand-ghost-white)" }}
      >
        {value}
      </span>
      {copyable && <CopyButton value={value} />}
    </div>
  </div>
)

const BacAccountCard = ({ account, order }: Props) => {
  const total = order.total ?? 0
  const totalLabel = convertToLocale({
    amount: total,
    currency_code: order.currency_code ?? "hnl",
  })

  return (
    <div
      className="rounded-rounded p-5 flex flex-col gap-y-1"
      style={{
        background: "var(--brand-void-black)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <Row label="Banco" value={account.bankName} />
      <Row label="Titular" value={account.holderName} copyable />
      <Row label="Tipo de cuenta" value={account.accountType} />
      <Row label="Moneda" value={account.currency} />
      <Row label="Número de cuenta" value={account.accountNumber} copyable />
      <Row label="Referencia (concepto)" value={`Pedido ${order.display_id}`} copyable />

      <div
        className="mt-3 pt-3 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--brand-amethyst)" }}
      >
        <span
          className="font-heading text-base"
          style={{ color: "var(--brand-ghost-white)" }}
        >
          Total a transferir
        </span>
        <div className="flex items-center gap-x-3">
          <span
            className="font-heading text-xl"
            style={{ color: "var(--brand-divine-lilac)" }}
          >
            {totalLabel}
          </span>
          <CopyButton value={String(total)} />
        </div>
      </div>
    </div>
  )
}

export default BacAccountCard
