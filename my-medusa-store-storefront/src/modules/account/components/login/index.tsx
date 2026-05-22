import { login } from "@lib/data/customer"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="surface-card max-w-sm w-full flex flex-col items-center p-8"
      data-testid="login-page"
    >
      <h1 className="text-large-semi uppercase mb-6 text-[color:var(--brand-ghost-white)]">
        Bienvenido de nuevo
      </h1>
      <p className="text-center text-base-regular text-[color:var(--brand-silver-ash)] mb-8">
        Ingresa tu email y contraseña para acceder a tu cuenta.
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="btn-primary w-full mt-6">
          Sign In
        </SubmitButton>
      </form>
      <span className="text-center text-[color:var(--brand-silver-ash)] text-small-regular mt-6">
        No tienes una cuenta?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline text-[color:var(--brand-sacred-violet)] hover:text-[color:var(--brand-divine-lilac)] transition-colors"
          data-testid="register-button"
        >
          Regístrate aquí
        </button>
        .
      </span>
    </div>
  )
}

export default Login
