"use client"

import { resetPassword } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useActionState } from "react"

type Props = {
  token?: string
  email?: string
}

const ResetPassword = ({ token, email }: Props) => {
  const [state, formAction] = useActionState(resetPassword, null)

  const missingParams = !token || !email

  return (
    <div
      className="surface-card max-w-sm w-full flex flex-col items-center p-8"
      data-testid="reset-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6 text-[color:var(--brand-ghost-white)]">
        Nueva contraseña
      </h1>

      {state?.state === "success" ? (
        <>
          <p
            className="text-center text-base-regular text-[color:var(--brand-silver-ash)] mb-8"
            data-testid="reset-password-success"
          >
            {state.message}
          </p>
          <LocalizedClientLink
            href="/account"
            className="btn-primary block w-full text-center"
            data-testid="go-to-login-button"
          >
            Iniciar sesión
          </LocalizedClientLink>
        </>
      ) : missingParams ? (
        <>
          <p className="text-center text-base-regular text-[color:var(--brand-silver-ash)] mb-8">
            El enlace de recuperación no es válido o está incompleto. Solicita
            uno nuevo desde la página de inicio de sesión.
          </p>
          <LocalizedClientLink
            href="/account"
            className="underline text-[color:var(--brand-sacred-violet)] hover:text-[color:var(--brand-divine-lilac)] transition-colors text-small-regular"
          >
            Ir a iniciar sesión
          </LocalizedClientLink>
        </>
      ) : (
        <>
          <p className="text-center text-base-regular text-[color:var(--brand-silver-ash)] mb-8">
            Crea una nueva contraseña para tu cuenta{" "}
            <strong className="text-[color:var(--brand-ghost-white)]">
              {email}
            </strong>
            .
          </p>
          <form className="w-full" action={formAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="email" value={email} />
            <div className="flex flex-col w-full gap-y-2">
              <Input
                label="Nueva contraseña"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                data-testid="password-input"
              />
              <Input
                label="Confirmar contraseña"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                data-testid="confirm-password-input"
              />
            </div>
            <ErrorMessage
              error={state?.state === "error" ? state.message : null}
              data-testid="reset-password-error-message"
            />
            <SubmitButton
              data-testid="submit-reset-password-button"
              className="btn-primary w-full mt-6"
            >
              Restablecer contraseña
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  )
}

export default ResetPassword
