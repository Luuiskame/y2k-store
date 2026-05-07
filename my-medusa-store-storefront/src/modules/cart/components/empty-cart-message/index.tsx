import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  return (
    <div
      data-testid="empty-cart-message"
      className="flex flex-col items-center text-center py-20 small:py-28 px-4 rounded-large"
      style={{
        background:
          "linear-gradient(180deg, var(--brand-void-black) 0%, var(--brand-abyss-purple) 100%)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <div
        className="w-16 h-16 mb-5 rounded-full flex items-center justify-center"
        style={{
          background: "var(--brand-void-black)",
          border: "1px solid var(--brand-amethyst)",
          color: "var(--brand-divine-lilac)",
          boxShadow: "0 0 24px rgba(155, 77, 202, 0.35)",
        }}
        aria-hidden
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 5H5L7 17H19L21 8H6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="20" r="1.5" fill="currentColor" />
          <circle cx="17" cy="20" r="1.5" fill="currentColor" />
        </svg>
      </div>

      <span
        className="text-xs uppercase tracking-[0.18em] mb-3"
        style={{ color: "var(--brand-sacred-violet)" }}
      >
        Y2K Fit Honduras
      </span>

      <h1
        className="font-heading text-3xl small:text-4xl mb-3"
        style={{ color: "var(--brand-ghost-white)" }}
      >
        Tu carrito está vacío
      </h1>

      <p
        className="max-w-md text-sm small:text-base mb-8 font-body"
        style={{ color: "var(--brand-silver-ash)" }}
      >
        Aún no has invocado nada. Explora nuestra colección de gym wear gótico
        diseñado para dominar el entrenamiento — y la calle.
      </p>

      <div className="flex flex-col small:flex-row gap-3">
        <LocalizedClientLink href="/store">
          <button type="button" className="btn-glow">
            Explorar productos
          </button>
        </LocalizedClientLink>
        <LocalizedClientLink href="/collections">
          <button type="button" className="btn-ghost">
            Ver colecciones
          </button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
