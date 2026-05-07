import repeat from "@lib/util/repeat"
import SkeletonCartItem from "@modules/skeletons/components/skeleton-cart-item"
import SkeletonOrderSummary from "@modules/skeletons/components/skeleton-order-summary"

const SkeletonCartPage = () => {
  return (
    <div className="py-10 small:py-14">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-[1fr_380px] gap-x-10 gap-y-8">
          <div className="flex flex-col gap-y-5 min-w-0">
            <div className="flex items-baseline justify-between pb-1">
              <div
                className="w-48 h-8 rounded animate-pulse"
                style={{ background: "rgba(155, 77, 202, 0.22)" }}
              />
              <div
                className="w-24 h-4 rounded animate-pulse"
                style={{ background: "rgba(192, 132, 252, 0.18)" }}
              />
            </div>

            <div className="flex flex-col gap-y-3">
              {repeat(3).map((index) => (
                <SkeletonCartItem key={index} />
              ))}
            </div>
          </div>

          <aside className="relative">
            <div className="sticky top-24">
              <SkeletonOrderSummary />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default SkeletonCartPage
