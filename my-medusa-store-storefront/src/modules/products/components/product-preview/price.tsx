import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <div className="flex items-center gap-2 font-body text-sm">
      {price.price_type === "sale" && (
        <span
          className="line-through text-xs"
          style={{ color: "var(--brand-silver-ash)" }}
          data-testid="original-price"
        >
          {price.original_price}
        </span>
      )}
      <span
        style={{
          color: price.price_type === "sale"
            ? "var(--brand-divine-lilac)"
            : "var(--brand-sacred-violet)",
        }}
        data-testid="price"
      >
        {price.calculated_price}
      </span>
    </div>
  )
}
