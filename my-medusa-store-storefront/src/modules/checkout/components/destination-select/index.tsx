"use client"

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react"
import {
  HONDURAS_DESTINATIONS,
  destinationCity,
  destinationLabel,
  findDestinationIndex,
  searchDestinationGroups,
} from "@lib/config/honduras-destinations"
import { ChevronUpDown } from "@medusajs/icons"
import { Label, clx } from "@medusajs/ui"
import React, { Fragment, useMemo, useState } from "react"

type DestinationSelectProps = {
  /** "shipping_address" o "billing_address": prefija los campos del formulario. */
  prefix: "shipping_address" | "billing_address"
  city?: string | null
  province?: string | null
  onSelect: (city: string, province: string) => void
  required?: boolean
  "data-testid"?: string
}

/**
 * Buscador de poblado / municipio de Honduras, agrupado por departamento.
 *
 * Es un combobox y no un <select> nativo a propósito: son 212 destinos, la
 * lista nativa se abre fuera del documento (se sale de la pantalla en móvil y
 * en el modo responsive del navegador) y no se puede filtrar escribiendo.
 *
 * El poblado elegido se guarda en `city` y su departamento en `province`
 * mediante inputs ocultos, para no cambiar el contrato del server action.
 */
const DestinationSelect = ({
  prefix,
  city,
  province,
  onSelect,
  required,
  "data-testid": dataTestid,
}: DestinationSelectProps) => {
  const id = `${prefix}.destination`
  const [query, setQuery] = useState("")

  const selectedIndex = findDestinationIndex(city, province)
  const selected = selectedIndex ? Number(selectedIndex) : null
  const selectedDestination =
    selected === null ? undefined : HONDURAS_DESTINATIONS[selected]

  const groups = useMemo(() => searchDestinationGroups(query), [query])

  const handleChange = (index: number | null) => {
    if (index === null) {
      return
    }

    const destination = HONDURAS_DESTINATIONS[index]
    onSelect(destinationCity(destination), destination.departamento)
  }

  return (
    <div className="flex flex-col w-full gap-y-2">
      <Label
        htmlFor={id}
        className="txt-compact-small-plus text-brand-silver-ash"
      >
        Poblado o municipio
        {required && <span className="text-rose-500">*</span>}
      </Label>

      <Combobox
        immediate
        value={selected}
        onChange={handleChange}
        onClose={() => setQuery("")}
      >
        {/* La tipografía va en el contenedor y no en el input: así la regla
            base de 16px en móvil (anti-zoom de iOS) le gana por especificidad. */}
        <div className="relative w-full text-base-regular">
          <ComboboxInput
            id={id}
            required={required}
            autoComplete="off"
            spellCheck={false}
            placeholder="Escribí o elegí tu poblado"
            displayValue={(index: number | null) =>
              index === null ? "" : destinationLabel(HONDURAS_DESTINATIONS[index])
            }
            onChange={(e) => setQuery(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full h-11 pl-4 pr-11 border rounded-md bg-brand-void-black text-brand-ghost-white border-brand-amethyst placeholder:text-brand-silver-ash outline-none focus:border-brand-sacred-violet focus:shadow-[0_0_0_2px_rgba(155,77,202,0.25)] transition-colors"
            data-testid={dataTestid}
          />

          <ComboboxButton
            className="absolute inset-y-0 right-0 flex items-center px-3 text-brand-silver-ash hover:text-brand-divine-lilac transition-colors"
            aria-label="Ver todos los destinos"
          >
            <ChevronUpDown />
          </ComboboxButton>

          <ComboboxOptions
            className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto overscroll-contain rounded-md border border-brand-amethyst bg-brand-abyss-purple shadow-[0_8px_24px_rgba(0,0,0,0.6)] focus:outline-none"
            data-testid={dataTestid ? `${dataTestid}-options` : undefined}
          >
            {groups.length === 0 ? (
              <p className="px-4 py-3 text-small-regular text-brand-silver-ash">
                No encontramos ese destino. Probá con el nombre del municipio.
              </p>
            ) : (
              groups.map((group) => (
                <Fragment key={group.departamento}>
                  <div className="sticky top-0 z-10 bg-brand-void-black px-4 py-1.5 font-heading text-xsmall-regular uppercase tracking-wider text-brand-divine-lilac">
                    {group.departamento}
                  </div>
                  {group.options.map((option) => (
                    <ComboboxOption
                      key={option.index}
                      value={option.index}
                      className={({ focus, selected: isSelected }) =>
                        clx(
                          "cursor-pointer select-none px-4 py-2.5 text-base-regular text-brand-ghost-white transition-colors",
                          {
                            "bg-brand-void-black text-brand-divine-lilac": focus,
                            "text-brand-divine-lilac": isSelected,
                          }
                        )
                      }
                    >
                      {option.label}
                    </ComboboxOption>
                  ))}
                </Fragment>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>

      <span className="text-xsmall-regular text-brand-silver-ash">
        {selectedDestination ? (
          <>
            Municipio:{" "}
            <span className="text-brand-divine-lilac">
              {selectedDestination.municipio}
            </span>{" "}
            · Departamento:{" "}
            <span className="text-brand-divine-lilac">
              {selectedDestination.departamento}
            </span>
          </>
        ) : (
          `Escribí para buscar entre los ${HONDURAS_DESTINATIONS.length} destinos, o tocá la flecha para verlos por departamento.`
        )}
      </span>

      <input type="hidden" name={`${prefix}.city`} value={city ?? ""} />
      <input type="hidden" name={`${prefix}.province`} value={province ?? ""} />
    </div>
  )
}

export default DestinationSelect
