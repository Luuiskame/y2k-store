"use client"

import { clx } from "@medusajs/ui"
import Spinner from "@modules/common/icons/spinner"

type QuantityStepperProps = {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  loading?: boolean
  className?: string
}

const QuantityStepper = ({
  value,
  onChange,
  min = 1,
  max = 10,
  loading = false,
  className,
}: QuantityStepperProps) => {
  const decrement = () => {
    if (loading) return
    if (value > min) onChange(value - 1)
  }

  const increment = () => {
    if (loading) return
    if (value < max) onChange(value + 1)
  }

  return (
    <div
      className={clx(
        "inline-flex items-center select-none rounded-full",
        className
      )}
      style={{
        background: "var(--brand-void-black)",
        border: "1px solid var(--brand-amethyst)",
      }}
      data-testid="product-select-button"
    >
      <button
        type="button"
        aria-label="Disminuir cantidad"
        onClick={decrement}
        disabled={loading || value <= min}
        className="w-9 h-9 flex items-center justify-center text-lg font-semibold transition-colors disabled:opacity-40"
        style={{ color: "var(--brand-ghost-white)" }}
      >
        −
      </button>
      <div
        className="w-9 h-9 flex items-center justify-center text-sm font-medium font-body"
        style={{ color: "var(--brand-ghost-white)" }}
        aria-live="polite"
      >
        {loading ? <Spinner /> : value}
      </div>
      <button
        type="button"
        aria-label="Aumentar cantidad"
        onClick={increment}
        disabled={loading || value >= max}
        className="w-9 h-9 flex items-center justify-center text-lg font-semibold transition-colors disabled:opacity-40"
        style={{ color: "var(--brand-ghost-white)" }}
      >
        +
      </button>
    </div>
  )
}

export default QuantityStepper
