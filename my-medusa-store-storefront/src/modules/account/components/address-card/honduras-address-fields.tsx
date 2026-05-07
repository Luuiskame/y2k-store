"use client"

import Input from "@modules/common/components/input"
import NativeSelect from "@modules/common/components/native-select"
import { HONDURAS_DEPARTMENTS } from "./honduras-departments"

type Defaults = {
  first_name?: string | null
  last_name?: string | null
  province?: string | null
  city?: string | null
  address_1?: string | null
  address_2?: string | null
  company?: string | null
  phone?: string | null
}

type Props = {
  defaults?: Defaults
  showName?: boolean
  showPhone?: boolean
  countryCode?: string
}

/**
 * Address fields tailored to Honduras:
 * - province  → Departamento (dropdown)
 * - city      → Ciudad
 * - address_1 → Calle
 * - address_2 → Colonia / Residencial
 * - company   → Referencias (cómo llegar)
 * postal_code defaults to "00000"; country defaults to "hn".
 */
const HondurasAddressFields = ({
  defaults,
  showName = true,
  showPhone = true,
  countryCode = "hn",
}: Props) => {
  return (
    <div className="flex flex-col gap-y-3">
      {showName && (
        <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
          <Input
            label="Nombre"
            name="first_name"
            required
            autoComplete="given-name"
            defaultValue={defaults?.first_name ?? undefined}
            data-testid="first-name-input"
          />
          <Input
            label="Apellido"
            name="last_name"
            required
            autoComplete="family-name"
            defaultValue={defaults?.last_name ?? undefined}
            data-testid="last-name-input"
          />
        </div>
      )}

      <NativeSelect
        name="province"
        required
        defaultValue={defaults?.province ?? ""}
        placeholder="Departamento"
        data-testid="province-select"
      >
        {HONDURAS_DEPARTMENTS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </NativeSelect>

      <Input
        label="Ciudad (ej. San Pedro Sula)"
        name="city"
        required
        autoComplete="address-level2"
        defaultValue={defaults?.city ?? undefined}
        data-testid="city-input"
      />

      <Input
        label="Calle (ej. 27 calle)"
        name="address_1"
        required
        autoComplete="address-line1"
        defaultValue={defaults?.address_1 ?? undefined}
        data-testid="address-1-input"
      />

      <Input
        label="Colonia o residencial"
        name="address_2"
        required
        autoComplete="address-line2"
        defaultValue={defaults?.address_2 ?? undefined}
        data-testid="address-2-input"
      />

      <Input
        label="Cómo llegar / referencias"
        name="company"
        defaultValue={defaults?.company ?? undefined}
        data-testid="references-input"
      />

      {showPhone && (
        <Input
          label="Teléfono"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          defaultValue={defaults?.phone ?? undefined}
          data-testid="phone-input"
        />
      )}

      <input type="hidden" name="postal_code" value="00000" />
      <input type="hidden" name="country_code" value={countryCode} />
    </div>
  )
}

export default HondurasAddressFields
