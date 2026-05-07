"use client"

import { clx } from "@medusajs/ui"
import { ArrowRightOnRectangle } from "@medusajs/icons"
import { useParams, usePathname } from "next/navigation"

import ChevronDown from "@modules/common/icons/chevron-down"
import User from "@modules/common/icons/user"
import MapPin from "@modules/common/icons/map-pin"
import Package from "@modules/common/icons/package"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { signout } from "@lib/data/customer"

const AccountNav = ({
  customer,
}: {
  customer: HttpTypes.StoreCustomer | null
}) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const isAccountRoot = route === `/${countryCode}/account`

  return (
    <div>
      {/* Mobile nav */}
      <div className="small:hidden" data-testid="mobile-account-nav">
        {!isAccountRoot ? (
          <LocalizedClientLink
            href="/account"
            className="flex items-center gap-x-2 text-small-regular py-3 px-4 border-b border-brand-amethyst"
            data-testid="account-main-link"
          >
            <ChevronDown className="transform rotate-90" />
            <span>Volver a Mi cuenta</span>
          </LocalizedClientLink>
        ) : (
          <>
            <div className="px-4 pt-2 pb-4">
              <div className="text-xl-semi">
                Hola {customer?.first_name || ""}
              </div>
              <div className="text-small-regular text-brand-silver-ash truncate">
                {customer?.email}
              </div>
            </div>
            <ul className="text-base-regular border-t border-brand-amethyst">
              <MobileNavLink
                href="/account/profile"
                icon={<User size={20} />}
                label="Perfil"
                testId="profile-link"
              />
              <MobileNavLink
                href="/account/addresses"
                icon={<MapPin size={20} />}
                label="Direcciones"
                testId="addresses-link"
              />
              <MobileNavLink
                href="/account/orders"
                icon={<Package size={20} />}
                label="Pedidos"
                testId="orders-link"
              />
              <li>
                <button
                  type="button"
                  className="flex items-center justify-between py-4 border-b border-brand-amethyst px-4 w-full hover:bg-brand-abyss-purple active:bg-brand-abyss-purple"
                  onClick={handleLogout}
                  data-testid="logout-button"
                >
                  <div className="flex items-center gap-x-3 text-rose-600">
                    <ArrowRightOnRectangle />
                    <span>Cerrar sesión</span>
                  </div>
                  <ChevronDown className="transform -rotate-90" />
                </button>
              </li>
            </ul>
          </>
        )}
      </div>

      {/* Desktop nav */}
      <div className="hidden small:block" data-testid="account-nav">
        <div className="pb-4 border-b border-brand-amethyst mb-4">
          <h3 className="text-base-semi">Mi cuenta</h3>
          {customer?.first_name && (
            <p className="text-small-regular text-brand-silver-ash mt-1">
              Hola, {customer.first_name}
            </p>
          )}
        </div>
        <ul className="flex flex-col gap-y-2">
          <li>
            <DesktopNavLink
              href="/account"
              route={route!}
              icon={<User size={16} />}
              testId="overview-link"
            >
              Resumen
            </DesktopNavLink>
          </li>
          <li>
            <DesktopNavLink
              href="/account/profile"
              route={route!}
              icon={<User size={16} />}
              testId="profile-link"
            >
              Perfil
            </DesktopNavLink>
          </li>
          <li>
            <DesktopNavLink
              href="/account/addresses"
              route={route!}
              icon={<MapPin size={16} />}
              testId="addresses-link"
            >
              Direcciones
            </DesktopNavLink>
          </li>
          <li>
            <DesktopNavLink
              href="/account/orders"
              route={route!}
              icon={<Package size={16} />}
              testId="orders-link"
            >
              Pedidos
            </DesktopNavLink>
          </li>
          <li className="mt-2 pt-2 border-t border-brand-amethyst">
            <button
              type="button"
              onClick={handleLogout}
              data-testid="logout-button"
              className="flex items-center gap-x-2 text-small-regular text-rose-600 hover:text-rose-700"
            >
              <ArrowRightOnRectangle />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}

const MobileNavLink = ({
  href,
  icon,
  label,
  testId,
}: {
  href: string
  icon: React.ReactNode
  label: string
  testId?: string
}) => (
  <li>
    <LocalizedClientLink
      href={href}
      className="flex items-center justify-between py-4 border-b border-brand-amethyst px-4 hover:bg-brand-abyss-purple active:bg-brand-abyss-purple"
      data-testid={testId}
    >
      <div className="flex items-center gap-x-3">
        {icon}
        <span>{label}</span>
      </div>
      <ChevronDown className="transform -rotate-90" />
    </LocalizedClientLink>
  </li>
)

type DesktopNavLinkProps = {
  href: string
  route: string
  children: React.ReactNode
  icon?: React.ReactNode
  testId?: string
}

const DesktopNavLink = ({
  href,
  route,
  children,
  icon,
  testId,
}: DesktopNavLinkProps) => {
  const { countryCode }: { countryCode: string } = useParams()

  const active = route.split(countryCode)[1] === href
  return (
    <LocalizedClientLink
      href={href}
      className={clx(
        "flex items-center gap-x-2 text-brand-silver-ash hover:text-brand-ghost-white text-small-regular py-1",
        {
          "text-brand-ghost-white font-semibold": active,
        }
      )}
      data-testid={testId}
    >
      {icon}
      {children}
    </LocalizedClientLink>
  )
}

export default AccountNav
