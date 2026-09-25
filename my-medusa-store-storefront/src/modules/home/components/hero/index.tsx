import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

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

      <div className="relative z-10 content-container flex flex-col items-center justify-center text-center py-10 small:py-16 gap-5 small:gap-7">
        {/* Scarcity + locality pill */}
        <span className="badge-glow tracking-[0.25em] text-[10px] small:text-xs">
          Y2K FIT
        </span>

        {/* Same asset the nav uses — cached file instead of an inlined SVG.
            Sized off the artwork's 419:596 ratio so the box never letterboxes. */}
        <span className="relative block h-[112px] w-[79px] small:h-[150px] small:w-[106px]">
          <Image
            src="/mainlogo.svg"
            alt="Y2K Fit Honduras"
            fill
            priority
            sizes="106px"
            className="object-contain invert"
          />
        </span>

        <div className="flex flex-col gap-3 max-w-2xl">
          <h1 className="font-heading uppercase tracking-[0.18em] text-3xl small:text-5xl text-brand-ghost-white">
            Camisetas de Compresión Góticas en Honduras
          </h1>
          <p className="font-body text-brand-silver-ash text-sm small:text-lg max-w-xl mx-auto leading-relaxed">
            Y2K Fit Honduras trae ropa gótica y camisetas de compresión
            Breathe Divinity con estilo Y2K. Compresión técnica con estética
            gótica para los que entrenan y buscan algo distinto. Por primera
            vez en Honduras
          </p>
        </div>

        {/* Collections lead — it tells a first-time visitor we carry several
            lines, and lands them on the rails right below the fold. */}
        <div className="flex flex-col small:flex-row items-center gap-3 small:gap-4 w-full small:w-auto">
          <a
            href="#featured-collections"
            className="btn-glow w-full small:w-auto text-center"
          >
            Ver colecciones ↓
          </a>
          <LocalizedClientLink
            href="/store"
            className="btn-ghost w-full small:w-auto inline-flex items-center justify-center min-h-[44px] font-heading uppercase tracking-[0.18em] text-xs"
          >
            Ver todo
          </LocalizedClientLink>
        </div>

        {/* Trust strip — three short signals, no claims we can't back */}
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] small:text-xs uppercase tracking-[0.28em] text-brand-silver-ash/80">
          <li>Envío a toda Honduras</li>
          <li aria-hidden className="hidden small:inline">
            ·
          </li>
          <li>Camisetas exclusivas</li>
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
