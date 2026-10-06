import {
  LINES,
  SizeCode,
  cmToIn,
  formatRange,
  kgToLb,
  metersLabel,
  premiumConversion,
  rowsFor,
} from "@lib/util/size-guide"
import { ReactNode } from "react"

type Pair = readonly [number, number]

// Sticky first column so the size stays in view while the rest scrolls on a phone.
const STICKY = "sticky left-0 bg-brand-void-black"

const Table = ({
  caption,
  head,
  children,
}: {
  caption: string
  head: ReactNode[]
  children: ReactNode
}) => (
  <div
    className="max-w-5xl overflow-x-auto [scrollbar-color:var(--brand-amethyst)_transparent] [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sacred-violet"
    tabIndex={0}
    role="region"
    aria-label={caption}
  >
    <table className="w-full min-w-[520px] border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-brand-amethyst/60">
          {head.map((label, i) => (
            <th
              key={i}
              scope="col"
              className={`py-3 pr-4 align-bottom font-heading text-xs uppercase tracking-widest text-brand-ghost-white ${
                i === 0 ? STICKY : ""
              }`}
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
)

const SizeCell = ({ size }: { size: SizeCode }) => (
  <th
    scope="row"
    className={`${STICKY} py-3 pr-4 text-left font-heading font-normal text-brand-ghost-white`}
  >
    {size}
  </th>
)

const Row = ({ children }: { children: ReactNode }) => (
  <tr className="border-b border-brand-amethyst/30">{children}</tr>
)

const Secondary = ({ children }: { children: ReactNode }) => (
  <span className="block text-xs text-brand-silver-ash/70">{children}</span>
)

/** Centimetres first, inches underneath: pants are asked for in inches here. */
const Length = ({ range }: { range: Pair }) => (
  <td className="py-3 pr-4 align-top">
    {formatRange(range)} cm
    <Secondary>
      {cmToIn(range[0])} – {cmToIn(range[1])} in
    </Secondary>
  </td>
)

const SingleLength = ({ cm }: { cm: number }) => (
  <td className="py-3 pr-4 align-top">
    {cm} cm
    <Secondary>{cmToIn(cm)} in</Secondary>
  </td>
)

const Reference = ({ height, weight }: { height: Pair; weight?: Pair }) => (
  <td className="py-3 pr-4 align-top">
    {metersLabel(height[0])} – {metersLabel(height[1])} m
    {weight && (
      <Secondary>
        {kgToLb(weight[0])} – {kgToLb(weight[1])} lb
      </Secondary>
    )}
  </td>
)

export const ShirtTable = ({
  sizes = LINES.estandar.sizes,
}: {
  sizes?: readonly SizeCode[]
}) => (
  <Table
    caption="Tabla de tallas de camisetas estándar"
    head={[
      "Talla",
      "Pecho (tu cuerpo)",
      "Largo (la prenda)",
      "Estatura y peso ref.",
    ]}
  >
    {rowsFor(sizes).map((row) => (
      <Row key={row.size}>
        <SizeCell size={row.size} />
        <Length range={row.chest} />
        <SingleLength cm={row.shirtLength} />
        <Reference height={row.height} weight={row.weightKg} />
      </Row>
    ))}
  </Table>
)

export const PremiumTable = () => (
  <Table
    caption="Qué talla premium pedir según tu talla habitual"
    head={[
      "Tu talla habitual",
      "Tu pecho",
      "Premium recomendada",
      "Premium máxima compresión",
    ]}
  >
    {premiumConversion().map((row) => (
      <Row key={row.usual}>
        <SizeCell size={row.usual} />
        <Length range={row.chest} />
        <td className="py-3 pr-4 align-top font-heading text-brand-ghost-white">
          {row.comfortable}
        </td>
        <td className="py-3 pr-4 align-top font-heading text-brand-ghost-white">
          {row.maximum}
        </td>
      </Row>
    ))}
  </Table>
)

export const JoggerTable = ({
  sizes = LINES.jogger.sizes,
}: {
  sizes?: readonly SizeCode[]
}) => (
  <Table
    caption="Tabla de tallas de joggers y buzos"
    head={[
      "Talla",
      "Cintura (tu cuerpo)",
      "Cadera (tu cuerpo)",
      "Largo (la prenda)",
      "Estatura ref.",
    ]}
  >
    {rowsFor(sizes).map((row) => (
      <Row key={row.size}>
        <SizeCell size={row.size} />
        <Length range={row.waist} />
        <Length range={row.hip} />
        <SingleLength cm={row.joggerLength} />
        <Reference height={row.height} />
      </Row>
    ))}
  </Table>
)
