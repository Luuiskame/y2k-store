import SkeletonButton from "@modules/skeletons/components/skeleton-button"
import SkeletonCartTotals from "@modules/skeletons/components/skeleton-cart-totals"

const SkeletonOrderSummary = () => {
  return (
    <div
      className="rounded-large p-5 small:p-6 flex flex-col gap-y-5"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <SkeletonCartTotals header />
      <SkeletonButton />
    </div>
  )
}

export default SkeletonOrderSummary
