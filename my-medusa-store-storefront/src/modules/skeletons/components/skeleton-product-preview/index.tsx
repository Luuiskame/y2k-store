// Same frame as ProductPreview (3:4 image, dark card), so nothing jumps and
// nothing flashes light when the real card replaces it.
const SkeletonProductPreview = () => {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-xl"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <div
        className="aspect-[3/4] w-full"
        style={{ background: "var(--brand-void-black)" }}
      />
      <div className="flex flex-col items-center gap-2 px-3 py-4">
        <div
          className="h-3 w-4/5 rounded-full"
          style={{ background: "var(--brand-void-black)" }}
        />
        <div
          className="h-3 w-2/5 rounded-full"
          style={{ background: "var(--brand-void-black)" }}
        />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
