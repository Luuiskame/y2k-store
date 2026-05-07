import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MedusaCTA from "@modules/layout/components/medusa-cta"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-brand-void-black relative small:min-h-screen">
      <div className="h-16 bg-brand-void-black border-b border-brand-amethyst">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-small-semi text-brand-ghost-white flex items-center gap-x-2 uppercase flex-1 basis-0 hover:text-brand-divine-lilac transition-colors"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-brand-silver-ash hover:text-brand-ghost-white">
              Volver al carrito
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-brand-silver-ash hover:text-brand-ghost-white">
              Volver
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="txt-compact-xlarge-plus font-display text-brand-sacred-violet hover:text-brand-divine-lilac uppercase tracking-wide transition-colors"
            data-testid="store-link"
          >
            Y2K Fit Honduras
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">{children}</div>
      <div className="py-4 w-full flex items-center justify-center">
        <MedusaCTA />
      </div>
    </div>
  )
}
