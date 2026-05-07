import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import Package from "@modules/common/icons/package"

const items = [
  {
    icon: FastDelivery,
    title: "Envío rápido",
    body: "Entrega a toda Honduras en 24–72h",
  },
  {
    icon: Package,
    title: "Pago seguro",
    body: "Tarjeta, transferencia o contra entrega",
  },
  {
    icon: Refresh,
    title: "Cambios fáciles",
    body: "7 días para cambios de talla",
  },
]

const TrustBadges = () => {
  return (
    <div
      className="rounded-large p-4 grid grid-cols-1 small:grid-cols-3 gap-3"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      {items.map(({ icon: Icon, title, body }) => (
        <div key={title} className="flex items-start gap-x-3">
          <span
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: "var(--brand-void-black)",
              border: "1px solid var(--brand-amethyst)",
              color: "var(--brand-divine-lilac)",
            }}
          >
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div
              className="text-sm font-medium font-body"
              style={{ color: "var(--brand-ghost-white)" }}
            >
              {title}
            </div>
            <div
              className="text-xs leading-snug mt-0.5"
              style={{ color: "var(--brand-silver-ash)" }}
            >
              {body}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TrustBadges
