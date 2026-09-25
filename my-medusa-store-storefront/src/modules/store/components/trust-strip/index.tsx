import { Cash, CreditCard, TruckFast } from "@medusajs/icons"

// Same promises the product page trust row and the cart's TrustBadges make;
// if a policy changes, change it in all three. The size-exchange promise is
// left out on purpose while it stays commented out on the product page.
const ITEMS = [
  {
    Icon: TruckFast,
    lead: "Envío a toda Honduras",
    rest: ", rastreado por WhatsApp",
  },
  {
    Icon: Cash,
    lead: "Pago contra entrega",
    rest: " en Tegucigalpa y SPS",
  },
  {
    Icon: CreditCard,
    lead: "Transferencia BAC sin recargo",
    rest: ", o tarjeta",
  },
]

/**
 * The three questions a first-time buyer asks before tapping a product —
 * does it reach me, can I pay on delivery, how else can I pay — as one short
 * line each, so they read at a glance without pushing the grid down.
 */
// No `clx` here on purpose: importing anything from "@medusajs/ui" in a
// server component drags the whole library (~245 kB gzipped) into the
// route's client bundle — /store measured 368 kB first-load JS with it,
// 123 kB without.
const TrustStrip = ({ className = "" }: { className?: string }) => (
  <ul className={`flex flex-col gap-2 ${className}`}>
    {ITEMS.map(({ Icon, lead, rest }) => (
      <li
        key={lead}
        className="flex items-center gap-2.5 text-xs leading-snug text-brand-silver-ash"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-amethyst bg-brand-abyss-purple text-brand-sacred-violet">
          <Icon aria-hidden className="h-3.5 w-3.5" />
        </span>
        <span>
          <span className="font-medium text-brand-ghost-white">{lead}</span>
          {rest}
        </span>
      </li>
    ))}
  </ul>
)

export default TrustStrip
