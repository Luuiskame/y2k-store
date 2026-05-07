import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div
      className="flex items-center justify-between gap-x-4 rounded-large p-4"
      style={{
        background: "var(--brand-abyss-purple)",
        border: "1px solid var(--brand-amethyst)",
      }}
    >
      <div className="min-w-0">
        <h3
          className="font-heading text-sm small:text-base"
          style={{ color: "var(--brand-ghost-white)" }}
        >
          ¿Ya tienes cuenta?
        </h3>
        <p
          className="text-xs small:text-sm mt-0.5"
          style={{ color: "var(--brand-silver-ash)" }}
        >
          Inicia sesión para un checkout más rápido.
        </p>
      </div>
      <LocalizedClientLink href="/account" className="shrink-0">
        <button
          type="button"
          className="btn-ghost text-sm"
          data-testid="sign-in-button"
        >
          Iniciar sesión
        </button>
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
