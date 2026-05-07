import { convertToLocale } from "@lib/util/money"

const FREE_SHIPPING_THRESHOLD = 1500

type FreeShippingBarProps = {
  subtotal: number
  currencyCode: string
}

const FreeShippingBar = ({ subtotal, currencyCode }: FreeShippingBarProps) => {
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0)
  const progress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)
  const qualifies = subtotal >= FREE_SHIPPING_THRESHOLD

  return (
    <div
      className="rounded-large p-4"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <div className="flex items-center justify-between text-sm font-body mb-2.5">
        {qualifies ? (
          <span
            className="font-medium"
            style={{ color: "var(--brand-divine-lilac)" }}
          >
            🌑 Tu pedido tiene envío gratis a toda Honduras
          </span>
        ) : (
          <>
            <span style={{ color: "var(--brand-silver-ash)" }}>
              Te faltan{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--brand-ghost-white)" }}
              >
                {convertToLocale({
                  amount: remaining,
                  currency_code: currencyCode,
                })}
              </span>{" "}
              para envío gratis
            </span>
          </>
        )}
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--brand-void-black)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, var(--brand-amethyst) 0%, var(--brand-sacred-violet) 60%, var(--brand-divine-lilac) 100%)",
            boxShadow: qualifies
              ? "0 0 12px rgba(192, 132, 252, 0.6)"
              : undefined,
          }}
        />
      </div>
    </div>
  )
}

export default FreeShippingBar
