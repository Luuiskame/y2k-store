import { requestPasswordReset } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const ForgotPassword = ({ setCurrentView }: Props) => {
  const [state, formAction] = useActionState(requestPasswordReset, null)

  return (
    <div
      className="surface-card max-w-sm w-full flex flex-col items-center p-8"
      data-testid="forgot-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6 text-[color:var(--brand-ghost-white)]">
        Recupera tu contraseña
      </h1>

      {state?.state === "success" ? (
        <>
          <p
            className="text-center text-base-regular text-[color:var(--brand-silver-ash)] mb-8"
            data-testid="forgot-password-success"
          >
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
            className="underline text-[color:var(--brand-sacred-violet)] hover:text-[color:var(--brand-divine-lilac)] transition-colors text-small-regular"
          >
            Volver a iniciar sesión
          </button>
        </>
      ) : (
        <>
          <p className="text-center text-base-regular text-[color:var(--brand-silver-ash)] mb-8">
            Ingresa tu email y te enviaremos un enlace para crear una nueva
            contraseña.
          </p>
          <form className="w-full" action={formAction}>
            <div className="flex flex-col w-full gap-y-2">
              <Input
                label="Email"
                name="email"
                type="email"
                title="Ingresa un correo válido."
                autoComplete="email"
                required
                data-testid="email-input"
              />
            </div>
            <ErrorMessage
              error={state?.state === "error" ? state.message : null}
              data-testid="forgot-password-error-message"
            />
            <SubmitButton
              data-testid="reset-password-button"
              className="btn-primary w-full mt-6"
            >
              Enviar enlace
            </SubmitButton>
          </form>
          <span className="text-center text-[color:var(--brand-silver-ash)] text-small-regular mt-6">
            ¿Ya la recordaste?{" "}
            <button
              onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
              className="underline text-[color:var(--brand-sacred-violet)] hover:text-[color:var(--brand-divine-lilac)] transition-colors"
            >
              Iniciar sesión
            </button>
            .
          </span>
        </>
      )}
    </div>
  )
}

export default ForgotPassword
