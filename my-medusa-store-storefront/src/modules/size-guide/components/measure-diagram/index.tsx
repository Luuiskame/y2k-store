const GARMENT = {
  fill: "var(--brand-abyss-purple)",
  stroke: "var(--brand-silver-ash)",
  strokeWidth: 1.5,
  strokeLinejoin: "round" as const,
}

const MEASURE = {
  stroke: "var(--brand-sacred-violet)",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
}

/** Numbered marker that matches the step list beside the diagram. */
const Marker = ({ x, y, n }: { x: number; y: number; n: number }) => (
  <g>
    <circle
      cx={x}
      cy={y}
      r={10}
      fill="var(--brand-violet-deep)"
      stroke="var(--brand-void-black)"
      strokeWidth={2}
    />
    <text
      x={x}
      y={y + 4}
      textAnchor="middle"
      fontSize={12}
      fontWeight={700}
      fill="var(--brand-ghost-white)"
      fontFamily="var(--brand-font-body)"
    >
      {n}
    </text>
  </g>
)

/** A measuring line with a tick at each end. */
const Span = ({
  from,
  to,
  axis,
}: {
  from: [number, number]
  to: [number, number]
  axis: "x" | "y"
}) => {
  const [x1, y1] = from
  const [x2, y2] = to
  const tick = 6

  return (
    <g {...MEASURE} fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {axis === "x" ? (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
        </>
      ) : (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
        </>
      )}
    </g>
  )
}

type DiagramProps = { className?: string }

/** Front view of a tee: 1 = chest around the body, 2 = garment length. */
export const ShirtDiagram = ({ className }: DiagramProps) => (
  <svg
    viewBox="0 0 240 250"
    role="img"
    aria-label="Camiseta de frente con dos medidas marcadas: 1, pecho, alrededor de la parte más ancha; 2, largo, del hombro junto al cuello hasta el borde inferior"
    className={className}
  >
    <path
      d="M92 24 L56 38 L14 84 L40 108 L62 88 L62 224 L178 224 L178 88 L200 108 L226 84 L184 38 L148 24 Q120 46 92 24 Z"
      {...GARMENT}
    />
    <Span from={[62, 98]} to={[178, 98]} axis="x" />
    <Marker x={106} y={98} n={1} />
    <Span from={[150, 28]} to={[150, 224]} axis="y" />
    <Marker x={150} y={170} n={2} />
  </svg>
)

/** Front view of a baggy jogger: 1 = waist, 2 = hip, 3 = garment length. */
export const JoggerDiagram = ({ className }: DiagramProps) => (
  <svg
    viewBox="0 0 240 250"
    role="img"
    aria-label="Jogger de frente con tres medidas marcadas: 1, cintura; 2, cadera, la parte más ancha; 3, largo, de la cintura al borde inferior por el costado"
    className={className}
  >
    <path
      d="M72 20 H168 L180 228 H124 L120 108 L116 228 H60 Z"
      {...GARMENT}
    />
    <line x1={72} y1={44} x2={168} y2={44} {...GARMENT} fill="none" />
    <path
      d="M114 44 Q112 60 118 68 M126 44 Q128 60 122 68"
      {...GARMENT}
      fill="none"
    />
    <Span from={[72, 32]} to={[168, 32]} axis="x" />
    <Marker x={92} y={32} n={1} />
    <Span from={[69, 92]} to={[171, 92]} axis="x" />
    <Marker x={92} y={92} n={2} />
    <Span from={[204, 20]} to={[204, 228]} axis="y" />
    <Marker x={204} y={130} n={3} />
  </svg>
)
