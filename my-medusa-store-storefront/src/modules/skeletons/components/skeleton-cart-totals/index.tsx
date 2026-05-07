const SkeletonCartTotals = ({ header = true }) => {
  const lineStyle = { background: "rgba(155, 77, 202, 0.22)" }

  return (
    <div className="flex flex-col">
      {header && (
        <div
          className="w-40 h-6 rounded animate-pulse mb-4"
          style={lineStyle}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="w-24 h-3 rounded animate-pulse" style={lineStyle} />
        <div className="w-20 h-3 rounded animate-pulse" style={lineStyle} />
      </div>

      <div className="flex items-center justify-between my-4">
        <div className="w-20 h-3 rounded animate-pulse" style={lineStyle} />
        <div className="w-24 h-3 rounded animate-pulse" style={lineStyle} />
      </div>

      <div className="flex items-center justify-between">
        <div className="w-28 h-3 rounded animate-pulse" style={lineStyle} />
        <div className="w-16 h-3 rounded animate-pulse" style={lineStyle} />
      </div>

      <div
        className="w-full h-px my-4"
        style={{ background: "var(--brand-amethyst)" }}
      />

      <div className="flex items-baseline justify-between">
        <div
          className="w-20 h-5 rounded animate-pulse"
          style={lineStyle}
        />
        <div
          className="w-28 h-7 rounded animate-pulse"
          style={{ background: "rgba(192, 132, 252, 0.28)" }}
        />
      </div>
    </div>
  )
}

export default SkeletonCartTotals
