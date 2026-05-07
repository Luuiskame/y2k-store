const SkeletonCodeForm = () => {
  const lineStyle = { background: "rgba(155, 77, 202, 0.22)" }

  return (
    <div className="w-full flex flex-col">
      <div
        className="h-5 w-28 rounded animate-pulse mb-4"
        style={lineStyle}
      />
      <div className="grid grid-cols-[1fr_80px] gap-x-2">
        <div
          className="h-12 rounded-rounded animate-pulse"
          style={lineStyle}
        />
        <div
          className="h-12 rounded-rounded animate-pulse"
          style={lineStyle}
        />
      </div>
    </div>
  )
}

export default SkeletonCodeForm
