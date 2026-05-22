import { Suspense } from "react"
import Image from "next/image"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import { User } from "@medusajs/icons"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b bg-brand-void-black/95 backdrop-blur-md border-brand-amethyst/60">
        <nav className="content-container flex items-center justify-between w-full h-full text-brand-silver-ash">
          {/* LEFT — hamburger (mobile) + logo */}
          <div className="flex items-center gap-x-3 small:gap-x-8 flex-1 small:flex-none basis-0 small:basis-auto">
            <div className="small:hidden">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>

            <LocalizedClientLink
              href="/"
              data-testid="nav-store-link"
              className="flex items-center gap-x-2 group/logo"
              aria-label="Y2K Fit Store — Inicio"
            >
              <span className="relative w-7 h-7 small:w-8 small:h-8 shrink-0">
                <Image
                  src="/mainlogo.svg"
                  alt=""
                  fill
                  priority
                  className="object-contain invert opacity-90 group-hover/logo:opacity-100 transition-opacity duration-200"
                />
              </span>
              <span className="font-heading tracking-[0.18em] text-sm small:text-base uppercase text-brand-sacred-violet group-hover/logo:text-brand-divine-lilac transition-colors duration-200">
                Y2K&nbsp;Fit
              </span>
            </LocalizedClientLink>
          </div>

          {/* CENTER — desktop nav links */}
          <ul className="hidden small:flex items-center gap-x-10 absolute left-1/2 -translate-x-1/2">
            <li>
              <LocalizedClientLink
                href="/"
                className="font-heading uppercase tracking-widest text-sm text-brand-ghost-white hover:text-brand-divine-lilac transition-colors duration-200"
                data-testid="nav-home-link"
              >
                Inicio
              </LocalizedClientLink>
            </li>
            <li>
              <LocalizedClientLink
                href="/store"
                className="font-heading uppercase tracking-widest text-sm text-brand-ghost-white hover:text-brand-divine-lilac transition-colors duration-200"
                data-testid="nav-store-page-link"
              >
                Tienda
              </LocalizedClientLink>
            </li>
            <li>
              <LocalizedClientLink
                href="/sobre-nosotros"
                className="font-heading uppercase tracking-widest text-sm text-brand-ghost-white hover:text-brand-divine-lilac transition-colors duration-200"
                data-testid="nav-about-link"
              >
                Sobre&nbsp;Nosotros
              </LocalizedClientLink>
            </li>
          </ul>

          {/* RIGHT — account + cart */}
          <div className="flex items-center gap-x-3 small:gap-x-5 h-full justify-end">
            <LocalizedClientLink
              className="hidden small:inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-silver-ash hover:text-brand-divine-lilac hover:bg-brand-abyss-purple/60 transition-all duration-200"
              href="/account"
              data-testid="nav-account-link"
              aria-label="Cuenta"
            >
              <User />
            </LocalizedClientLink>

            <Suspense
              fallback={
                <LocalizedClientLink
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-silver-ash hover:text-brand-divine-lilac transition-colors duration-200"
                  href="/cart"
                  data-testid="nav-cart-link"
                  aria-label="Carrito"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M6 2.5A1.5 1.5 0 0 1 7.5 1h5A1.5 1.5 0 0 1 14 2.5V4h2.5a1.5 1.5 0 0 1 1.49 1.66l-1.1 10A1.5 1.5 0 0 1 15.4 17H4.6a1.5 1.5 0 0 1-1.49-1.34l-1.1-10A1.5 1.5 0 0 1 3.5 4H6V2.5ZM7.5 4h5V2.5h-5V4Z" />
                  </svg>
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
