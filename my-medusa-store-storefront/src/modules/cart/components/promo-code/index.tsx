"use client"

import { applyPromotions } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import { useState, useTransition } from "react"

type PromoCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

const PromoCode = ({ cart }: PromoCodeProps) => {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const { promotions = [] } = cart

  const apply = () => {
    if (!code.trim()) return
    const codes = promotions
      .filter((p) => p.code !== undefined)
      .map((p) => p.code!)
    codes.push(code.trim())
    setError("")
    startTransition(async () => {
      try {
        await applyPromotions(codes)
        setCode("")
      } catch (e: any) {
        setError(e.message ?? "Código inválido")
      }
    })
  }

  const remove = (codeToRemove: string) => {
    const remaining = promotions
      .filter((p) => p.code !== undefined && p.code !== codeToRemove)
      .map((p) => p.code!)
    startTransition(async () => {
      await applyPromotions(remaining)
    })
  }

  return (
    <div className="flex flex-col gap-y-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm font-medium text-left transition-colors hover:underline"
        style={{ color: "var(--brand-sacred-violet)" }}
        data-testid="add-discount-button"
      >
        {open ? "− Ocultar código" : "+ ¿Tienes un código de descuento?"}
      </button>

      {open && (
        <div className="flex gap-x-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ingresa tu código"
            className="flex-1 px-3 py-2 rounded-rounded text-sm font-body outline-none transition-colors"
            style={{
              background: "var(--brand-void-black)",
              color: "var(--brand-ghost-white)",
              border: "1px solid var(--brand-amethyst)",
            }}
            data-testid="discount-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                apply()
              }
            }}
          />
          <button
            type="button"
            onClick={apply}
            disabled={pending || !code.trim()}
            className="btn-ghost text-sm disabled:opacity-50"
            data-testid="discount-apply-button"
          >
            {pending ? "..." : "Aplicar"}
          </button>
        </div>
      )}

      {error && (
        <div
          className="text-xs"
          style={{ color: "var(--brand-divine-lilac)" }}
          data-testid="discount-error-message"
        >
          {error}
        </div>
      )}

      {promotions.length > 0 && (
        <div className="flex flex-col gap-y-2">
          {promotions.map((promotion) => {
            const value = promotion.application_method?.value
            const valueLabel =
              value !== undefined &&
              promotion.application_method?.currency_code !== undefined
                ? promotion.application_method.type === "percentage"
                  ? `${value}%`
                  : convertToLocale({
                      amount: +value,
                      currency_code:
                        promotion.application_method.currency_code,
                    })
                : null

            return (
              <div
                key={promotion.id}
                className="flex items-center justify-between rounded-full px-3 py-1.5 text-xs"
                style={{
                  background: "var(--brand-void-black)",
                  border: "1px solid var(--brand-amethyst)",
                }}
                data-testid="discount-row"
              >
                <span
                  className="truncate font-medium"
                  style={{ color: "var(--brand-divine-lilac)" }}
                  data-testid="discount-code"
                >
                  {promotion.code}
                  {valueLabel && (
                    <span
                      className="ml-2"
                      style={{ color: "var(--brand-silver-ash)" }}
                    >
                      ({valueLabel})
                    </span>
                  )}
                </span>

                {!promotion.is_automatic && promotion.code && (
                  <button
                    type="button"
                    onClick={() => remove(promotion.code!)}
                    className="ml-2 transition-opacity hover:opacity-100 opacity-70"
                    style={{ color: "var(--brand-silver-ash)" }}
                    aria-label="Quitar código"
                    data-testid="remove-discount-button"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PromoCode
