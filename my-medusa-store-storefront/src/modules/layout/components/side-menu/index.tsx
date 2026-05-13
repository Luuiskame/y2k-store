"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import {
  ArrowRightMini,
  BarsThree,
  BuildingStorefront,
  Heart,
  House,
  ShoppingBag,
  User,
  XMark,
} from "@medusajs/icons"
import { Text, clx, useToggleState } from "@medusajs/ui"
import { Fragment } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { HttpTypes } from "@medusajs/types"
import { Locale } from "@lib/data/locales"

type MenuItem = {
  name: string
  href: string
  Icon: React.ComponentType<{ className?: string }>
}

const SideMenuItems: MenuItem[] = [
  { name: "Inicio", href: "/", Icon: House },
  { name: "Tienda", href: "/store", Icon: BuildingStorefront },
  { name: "Favoritos", href: "/account/@dashboard/profile", Icon: Heart },
  { name: "Cuenta", href: "/account", Icon: User },
  { name: "Carrito", href: "/cart", Icon: ShoppingBag },
]

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
}

const SideMenu = ({ regions, locales, currentLocale }: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  aria-label="Abrir menú"
                  className="relative h-full flex items-center justify-center w-9 text-brand-silver-ash hover:text-brand-divine-lilac transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-sacred-violet rounded"
                >
                  <BarsThree />
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/60 backdrop-blur-sm pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 -translate-x-4"
                enterTo="opacity-100 translate-x-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-x-0"
                leaveTo="opacity-0 -translate-x-4"
              >
                <PopoverPanel
                  className="fixed top-0 left-0 z-[51] flex flex-col w-[86%] xsmall:w-[380px] h-screen text-brand-ghost-white border-r border-brand-amethyst/60 shadow-[0_0_40px_rgba(155,77,202,0.25)]"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--brand-void-black) 0%, var(--brand-abyss-purple) 100%)",
                  }}
                >
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full justify-between p-6"
                  >
                    {/* Header — brand mark + close */}
                    <div className="flex items-center justify-between mb-8">
                      <span className="font-heading tracking-[0.2em] uppercase text-base text-brand-sacred-violet">
                        Y2K&nbsp;Fit
                      </span>
                      <button
                        data-testid="close-menu-button"
                        onClick={close}
                        aria-label="Cerrar menú"
                        className="flex items-center justify-center w-9 h-9 rounded-full text-brand-silver-ash hover:text-brand-divine-lilac hover:bg-brand-abyss-purple/60 transition-all duration-200"
                      >
                        <XMark />
                      </button>
                    </div>

                    {/* Menu items */}
                    <ul className="flex flex-col gap-1 items-start justify-start flex-1">
                      {SideMenuItems.map(({ name, href, Icon }) => (
                        <li key={name} className="w-full">
                          <LocalizedClientLink
                            href={href}
                            className="flex items-center gap-x-4 w-full py-3 px-3 rounded-rounded font-heading uppercase tracking-widest text-lg text-brand-ghost-white hover:text-brand-divine-lilac hover:bg-brand-abyss-purple/60 transition-all duration-200"
                            onClick={close}
                            data-testid={`${name.toLowerCase()}-link`}
                          >
                            <Icon className="w-5 h-5 text-brand-sacred-violet" />
                            <span>{name}</span>
                          </LocalizedClientLink>
                        </li>
                      ))}
                    </ul>

                    {/* Footer — region / language / copyright */}
                    <div className="flex flex-col gap-y-5 pt-6 border-t border-brand-amethyst/40">
                      {!!locales?.length && (
                        <div
                          className="flex justify-between items-center text-brand-silver-ash"
                          onMouseEnter={languageToggleState.open}
                          onMouseLeave={languageToggleState.close}
                        >
                          <LanguageSelect
                            toggleState={languageToggleState}
                            locales={locales}
                            currentLocale={currentLocale}
                          />
                          <ArrowRightMini
                            className={clx(
                              "transition-transform duration-150",
                              languageToggleState.state ? "-rotate-90" : ""
                            )}
                          />
                        </div>
                      )}
                      <div
                        className="flex justify-between items-center text-brand-silver-ash"
                        onMouseEnter={countryToggleState.open}
                        onMouseLeave={countryToggleState.close}
                      >
                        {regions && (
                          <CountrySelect
                            toggleState={countryToggleState}
                            regions={regions}
                          />
                        )}
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150",
                            countryToggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                      <Text className="text-xs text-brand-silver-ash/70">
                        © {new Date().getFullYear()} Y2K Fit Store. Todos los
                        derechos reservados.
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
