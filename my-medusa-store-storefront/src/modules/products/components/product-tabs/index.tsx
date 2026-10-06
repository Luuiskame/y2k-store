"use client"

import { getFitProfile } from "@lib/util/fit-profile"
import { getProductStock } from "@lib/util/product-availability"
import {
  LINES,
  formatRange,
  guideHref,
  premiumConversion,
  rowsFor,
} from "@lib/util/size-guide"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const tabs = [
    {
      label: "Detalles del producto",
      component: <ProductInfoTab product={product} />,
    },
    {
      label: "Guía de tallas",
      component: <SizeGuideTab product={product} />,
    },
    {
      label: "Envío y cambios",
      component: <ShippingInfoTab />,
    },
    {
      label: "Historia de la tela",
      component: <FabricStoryTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab, i) => (
          <Accordion.Item
            key={i}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 border-b border-[var(--brand-amethyst)]/30 last:border-b-0">
    <span className="font-heading uppercase tracking-[0.18em] text-xs text-brand-silver-ash">
      {label}
    </span>
    <span className="text-sm text-brand-ghost-white text-right">{value}</span>
  </div>
)

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  const dimensions =
    product.length && product.width && product.height
      ? `${product.length}L × ${product.width}W × ${product.height}H`
      : "—"

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 small:grid-cols-2 gap-x-12 gap-y-1">
        <Row label="Material" value={product.material || "—"} />
        <Row label="Peso" value={product.weight ? `${product.weight} g` : "—"} />
        <Row label="Origen" value={product.origin_country || "—"} />
        <Row label="Tipo" value={product.type?.value || "—"} />
        <Row label="Medidas" value={dimensions} />
      </div>
    </div>
  )
}

const TH =
  "font-heading uppercase tracking-[0.18em] text-xs text-brand-silver-ash py-2 pr-4 font-normal"
const TR = "border-t border-[var(--brand-amethyst)]/30"

const SizeGuideTab = ({ product }: ProductTabsProps) => {
  // Same classification as the fit note and the recommendation next to the
  // size selector — telling someone to size up there and offering "size down
  // for max compression" here is how you get a refused delivery.
  const profile = getFitProfile(product)
  const line = profile ? LINES[profile] : null

  // Only the sizes this product is sold in; a table with rows it doesn't
  // have reads as stock that is missing.
  const own = rowsFor(getProductStock(product).sizes.map((s) => s.size))
  const rows = own.length ? own : rowsFor(line?.sizes ?? LINES.estandar.sizes)

  const intro =
    profile === "premium"
      ? "Esta prenda es de corte compresivo ajustado. Te recomendamos pedir una talla más de la que usas normalmente; si buscas máxima compresión, quédate en tu talla habitual."
      : profile === "estandar"
        ? `${LINES.estandar.rule}. ${LINES.estandar.reason} Si estás entre dos tallas, la menor marca más y la mayor es más cómoda.`
        : profile === "jogger"
          ? `${LINES.jogger.reason} ${LINES.jogger.rule}; una menos si lo quieres menos holgado, una más para un look oversize.`
          : "Si dudas entre dos tallas, elige la mayor para un fit más relajado o la menor para un ajuste más ceñido."

  return (
    <div className="py-6 flex flex-col gap-4">
      <p className="text-sm text-brand-silver-ash leading-relaxed">{intro}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Tabla de tallas en centímetros</caption>
          <thead>
            <tr className="text-left">
              {profile === "premium" ? (
                <>
                  <th scope="col" className={TH}>
                    Tu talla habitual
                  </th>
                  <th scope="col" className={TH}>
                    Pecho (cm)
                  </th>
                  <th scope="col" className={TH}>
                    Pide en premium
                  </th>
                </>
              ) : profile === "jogger" ? (
                <>
                  <th scope="col" className={TH}>
                    Talla
                  </th>
                  <th scope="col" className={TH}>
                    Cintura (cm)
                  </th>
                  <th scope="col" className={TH}>
                    Cadera (cm)
                  </th>
                  <th scope="col" className={TH}>
                    Largo (cm)
                  </th>
                </>
              ) : (
                <>
                  <th scope="col" className={TH}>
                    Talla
                  </th>
                  <th scope="col" className={TH}>
                    Pecho (cm)
                  </th>
                  <th scope="col" className={TH}>
                    Largo (cm)
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-brand-ghost-white">
            {profile === "premium"
              ? premiumConversion().map((row) => (
                  <tr key={row.usual} className={TR}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      {row.usual}
                    </th>
                    <td className="py-2 pr-4">{formatRange(row.chest)}</td>
                    <td className="py-2 pr-4">{row.comfortable}</td>
                  </tr>
                ))
              : rows.map((row) => (
                  <tr key={row.size} className={TR}>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">
                      {row.size}
                    </th>
                    {profile === "jogger" ? (
                      <>
                        <td className="py-2 pr-4">{formatRange(row.waist)}</td>
                        <td className="py-2 pr-4">{formatRange(row.hip)}</td>
                        <td className="py-2 pr-4">{row.joggerLength}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-4">{formatRange(row.chest)}</td>
                        <td className="py-2 pr-4">{row.shirtLength}</td>
                      </>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <LocalizedClientLink
        href={guideHref(profile ?? "estandar")}
        className="self-start font-heading uppercase tracking-[0.18em] text-[11px] underline underline-offset-4"
        style={{ color: "var(--brand-sacred-violet)" }}
      >
        Ver guía de tallas completa
      </LocalizedClientLink>
    </div>
  )
}

const ShippingInfoTab = () => {
  const items = [
    {
      icon: <FastDelivery />,
      title: "Envío Nacional",
      body: "Entrega en 2–5 días hábiles a todo Honduras. SPS con entrega inmediata el mismo día.",
    },
    // {
    //   icon: <Refresh />,
    //   title: "Cambios de Talla",
    //   body: "Si la talla no encaja, te la cambiamos sin preguntas dentro de los primeros 7 días.",
    // },
    {
      icon: <Back />,
      title: "Devoluciones",
      body: "Producto sin uso, etiquetas puestas. Procesamos el reembolso en 3–5 días hábiles.",
    },
  ]

  return (
    <div className="py-6 grid grid-cols-1 gap-y-6">
      {items.map(({ icon, title, body }) => (
        <div key={title} className="flex items-start gap-x-3">
          <span style={{ color: "var(--brand-sacred-violet)" }}>{icon}</span>
          <div>
            <span className="font-heading uppercase tracking-[0.18em] text-sm text-brand-ghost-white">
              {title}
            </span>
            <p className="max-w-sm text-sm text-brand-silver-ash leading-relaxed mt-1">
              {body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

const FabricStoryTab = () => {
  return (
    <div className="py-6 flex flex-col gap-4 text-sm leading-relaxed text-brand-silver-ash">
      <p>
        Esta camiseta es una aleacion de expandex y poliester que le da ese fit compresivo y a la vez suave que la hace perfecta para el dia a dia. Cada prenda se revisa y empaca a mano en Honduras por nuestro fundador Luis, quien se asegura de que cada envío llegue en las mejores condiciones a tu puerta.
      </p>
      <p>
        Cada lote lo revisamos a mano antes de etiquetar. Si una pieza no pasa
        el control, no la vendemos. Esa es la única forma que conocemos de
        hacer una marca que dure en Honduras.
      </p>
    </div>
  )
}

export default ProductTabs
