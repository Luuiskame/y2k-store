const SkeletonCartItem = () => {
  return (
    <div
      className="relative flex gap-x-4 small:gap-x-5 p-3 small:p-4 rounded-large"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <div
        className="w-24 small:w-28 aspect-square rounded-large shrink-0 animate-pulse"
        style={{ background: "rgba(155, 77, 202, 0.18)" }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-x-2">
          <div className="min-w-0 flex-1 flex flex-col gap-y-2">
            <div
              className="w-3/4 h-4 rounded animate-pulse"
              style={{ background: "rgba(155, 77, 202, 0.22)" }}
            />
            <div
              className="w-1/3 h-3 rounded animate-pulse"
              style={{ background: "rgba(192, 132, 252, 0.18)" }}
            />
            <div
              className="w-1/2 h-3 rounded animate-pulse"
              style={{ background: "rgba(192, 132, 252, 0.14)" }}
            />
          </div>

          <div
            className="w-6 h-6 rounded-full animate-pulse shrink-0"
            style={{ background: "rgba(155, 77, 202, 0.18)" }}
          />
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between gap-x-3 flex-wrap">
          <div
            className="w-28 h-9 rounded-rounded animate-pulse"
            style={{ background: "rgba(155, 77, 202, 0.22)" }}
          />
          <div
            className="w-20 h-5 rounded animate-pulse"
            style={{ background: "rgba(192, 132, 252, 0.22)" }}
          />
        </div>
      </div>
    </div>
  )
}

export default SkeletonCartItem
