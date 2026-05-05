"use client"

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
      component: <SizeGuideTab />,
    },
    {
      label: "Envío y cambios",
      component: <ShippingInfoTab />,
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

const SizeGuideTab = () => {
  return (
    <div className="py-6 flex flex-col gap-4">
      <p className="text-sm text-brand-silver-ash leading-relaxed">
        Nuestras prendas son de corte compresivo. Si dudas entre dos tallas,
        elige la mayor para un fit más relajado o la menor para máxima
        compresión.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="font-heading uppercase tracking-[0.18em] text-xs text-brand-silver-ash py-2">
                Talla
              </th>
              <th className="font-heading uppercase tracking-[0.18em] text-xs text-brand-silver-ash py-2">
                Pecho (cm)
              </th>
              <th className="font-heading uppercase tracking-[0.18em] text-xs text-brand-silver-ash py-2">
                Largo (cm)
              </th>
            </tr>
          </thead>
          <tbody className="text-brand-ghost-white">
            <tr className="border-t border-[var(--brand-amethyst)]/30">
              <td className="py-2">S</td>
              <td className="py-2">86 – 91</td>
              <td className="py-2">68</td>
            </tr>
            <tr className="border-t border-[var(--brand-amethyst)]/30">
              <td className="py-2">M</td>
              <td className="py-2">92 – 97</td>
              <td className="py-2">70</td>
            </tr>
            <tr className="border-t border-[var(--brand-amethyst)]/30">
              <td className="py-2">L</td>
              <td className="py-2">98 – 104</td>
              <td className="py-2">72</td>
            </tr>
            <tr className="border-t border-[var(--brand-amethyst)]/30">
              <td className="py-2">XL</td>
              <td className="py-2">105 – 112</td>
              <td className="py-2">74</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ShippingInfoTab = () => {
  const items = [
    {
      icon: <FastDelivery />,
      title: "Envío Nacional",
      body: "Entrega en 2–5 días hábiles a todo Honduras. Tegucigalpa y SPS reciben antes.",
    },
    {
      icon: <Refresh />,
      title: "Cambios de Talla",
      body: "Si la talla no encaja, te la cambiamos sin preguntas dentro de los primeros 7 días.",
    },
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

export default ProductTabs
