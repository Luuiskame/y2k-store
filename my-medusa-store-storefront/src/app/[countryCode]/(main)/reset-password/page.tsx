import { Metadata } from "next"

import ResetPassword from "@modules/account/components/reset-password"

export const metadata: Metadata = {
  title: "Restablecer contraseña · Y2K Fit Honduras",
  description: "Crea una nueva contraseña para tu cuenta de Y2K Fit Honduras.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Restablecer contraseña · Y2K Fit Honduras",
    description: "Crea una nueva contraseña para tu cuenta de Y2K Fit Honduras.",
    type: "website",
    images: ["/opengraph-image.png"],
  },
}

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await props.searchParams

  return (
    <div className="w-full flex justify-center px-4 sm:px-8 py-12">
      <ResetPassword token={token} email={email} />
    </div>
  )
}
