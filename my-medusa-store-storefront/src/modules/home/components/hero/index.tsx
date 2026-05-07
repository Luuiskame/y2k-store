import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Logo from "@modules/common/icons/logo"

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-brand-void-black">
      {/* Layered background: void→abyss gradient, central violet glow, vignette */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 surface-gradient" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 50% 42%, rgba(155, 77, 202, 0.35), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(10, 10, 10, 0.9) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 content-container min-h-[88vh] flex flex-col items-center justify-center text-center py-20 small:py-28 gap-8">
        {/* Scarcity + locality pill */}
        <span className="badge-glow tracking-[0.25em] text-[10px] small:text-xs">
          Drop 001 · Hecho en Honduras
        </span>

        <div>
          <Logo/>
        </div>

        <div className="flex flex-col gap-3 max-w-2xl">
          <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white">
            Forged in the Dark
          </h1>
          <p className="font-body text-brand-silver-ash text-sm small:text-lg max-w-xl mx-auto leading-relaxed">
            Compresión técnica con estética gótica. Activewear de alto
            rendimiento para los que entrenan distinto — el primero y único en
            Honduras.
          </p>
        </div>

        <div className="flex flex-col small:flex-row items-center gap-4 mt-2">
          <LocalizedClientLink href="/store" className="btn-glow">
            Ver productos
          </LocalizedClientLink>
          <a
            href="#featured-collections"
            className="font-heading uppercase tracking-[0.25em] text-xs text-brand-silver-ash hover:text-brand-divine-lilac transition-colors"
          >
            Explorar colecciones ↓
          </a>
        </div>

        {/* Trust strip — three short signals, no claims we can't back */}
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] small:text-xs uppercase tracking-[0.28em] text-brand-silver-ash/80">
          <li>Envío a toda Honduras</li>
          <li aria-hidden className="hidden small:inline">
            ·
          </li>
          <li>Drops Limitados</li>
          <li aria-hidden className="hidden small:inline">
            ·
          </li>
          <li>Único en Honduras</li>
        </ul>
      </div>

      {/* Soft fade into the next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 inset-x-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, var(--brand-void-black) 100%)",
        }}
      />
    </section>
  )
}

export default Hero
