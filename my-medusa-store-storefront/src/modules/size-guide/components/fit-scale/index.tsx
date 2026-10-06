type FitScaleProps = {
  /** 1 = maximum compression … 5 = baggy. */
  level: 1 | 2 | 3 | 4 | 5
}

const STEPS = [1, 2, 3, 4, 5] as const

/**
 * Where a cut sits between compression and baggy. Drawn rather than described
 * so the three lines can be compared at a glance; the label carries the same
 * information for screen readers.
 */
const FitScale = ({ level }: FitScaleProps) => (
  <div>
    <div
      role="img"
      aria-label={`Nivel de ajuste ${level} de 5, donde 1 es compresión y 5 es holgado`}
      className="flex gap-1.5"
    >
      {STEPS.map((step) => (
        <span
          key={step}
          className="h-1.5 flex-1 rounded-full"
          style={{
            backgroundColor:
              step === level
                ? "var(--brand-sacred-violet)"
                : "var(--brand-amethyst)",
            opacity: step === level ? 1 : 0.35,
          }}
        />
      ))}
    </div>
    <div
      aria-hidden
      className="mt-1.5 flex justify-between text-[10px] uppercase tracking-[0.14em] text-brand-silver-ash"
    >
      <span>Compresión</span>
      <span>Holgado</span>
    </div>
  </div>
)

export default FitScale
