import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mantenimiento · Y2K Fit Honduras",
  description:
    "Estamos realizando trabajos en el santuario. Volveremos en breve.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-static"

export default function MaintenancePage() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-16"
      style={{ background: "var(--brand-void-black, #0A0A0A)" }}
    >
      <div className="max-w-xl w-full text-center flex flex-col items-center gap-6">
        <div
          aria-hidden
          className="text-7xl md:text-8xl select-none"
          style={{
            fontFamily: "var(--font-unifraktur), serif",
            color: "var(--brand-sacred-violet, #9B4DCA)",
            textShadow: "0 0 24px rgba(155, 77, 202, 0.45)",
          }}
        >
          ✟
        </div>

        <h1
          className="text-3xl md:text-5xl tracking-wide"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "var(--brand-ghost-white, #F4F4F5)",
          }}
        >
          Sitio en mantenimiento
        </h1>

        <p
          className="text-base md:text-lg leading-relaxed"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            color: "var(--brand-silver-ash, #B5B5BD)",
          }}
        >
          Estamos realizando trabajos. El sitio volverá en unos minutos.
          Gracias por tu paciencia.
        </p>

        <p
          className="text-xs uppercase tracking-[0.3em]"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "var(--brand-amethyst, #7B2D8E)",
          }}
        >
          Y2K Fit Honduras
        </p>

        <a
          href="/"
          className="mt-4 inline-block px-6 py-3 text-sm uppercase tracking-widest transition-colors"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "var(--brand-ghost-white, #F4F4F5)",
            border: "1px solid var(--brand-amethyst, #7B2D8E)",
          }}
        >
          Reintentar
        </a>
      </div>
    </div>
  )
}
