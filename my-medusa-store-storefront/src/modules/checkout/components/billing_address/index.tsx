import { joinFullName, splitFullName } from "@lib/util/full-name"
import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import { useParams } from "next/navigation"
import React, { useState } from "react"
import DestinationSelect from "../destination-select"

/** Mismo mapeo de campos que la dirección de envío (ver ../shipping-address). */
const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const params = useParams() as { countryCode?: string }

  const countryCode =
    params.countryCode ||
    cart?.billing_address?.country_code ||
    cart?.region?.countries?.[0]?.iso_2 ||
    "hn"

  const [formData, setFormData] = useState<Record<string, any>>({
    "billing_address.full_name": joinFullName(
      cart?.billing_address?.first_name,
      cart?.billing_address?.last_name
    ),
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.address_2": cart?.billing_address?.address_2 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const { first_name, last_name } = splitFullName(
    formData["billing_address.full_name"]
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        <DestinationSelect
          prefix="billing_address"
          city={formData["billing_address.city"]}
          province={formData["billing_address.province"]}
          onSelect={(city, province) =>
            setFormData((prevState: Record<string, any>) => ({
              ...prevState,
              "billing_address.city": city,
              "billing_address.province": province,
            }))
          }
          required
          data-testid="billing-destination-select"
        />
        <Input
          label="Dirección exacta"
          name="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="billing-address-input"
        />
        <Input
          label="Referencia 1 (cómo llegar)"
          name="billing_address.address_2"
          autoComplete="address-line2"
          value={formData["billing_address.address_2"]}
          onChange={handleChange}
          required
          data-testid="billing-reference-1-input"
        />
        <Input
          label="Referencia 2 (opcional)"
          name="billing_address.company"
          value={formData["billing_address.company"]}
          onChange={handleChange}
          data-testid="billing-reference-2-input"
        />
        <div className="grid grid-cols-1 small:grid-cols-2 gap-4">
          <Input
            label="Nombre completo"
            name="billing_address.full_name"
            autoComplete="name"
            value={formData["billing_address.full_name"]}
            onChange={handleChange}
            required
            data-testid="billing-full-name-input"
          />
          <Input
            label="Número de teléfono"
            name="billing_address.phone"
            type="tel"
            autoComplete="tel"
            value={formData["billing_address.phone"]}
            onChange={handleChange}
            required
            data-testid="billing-phone-input"
          />
        </div>
      </div>

      <input
        type="hidden"
        name="billing_address.first_name"
        value={first_name}
      />
      <input type="hidden" name="billing_address.last_name" value={last_name} />
      <input type="hidden" name="billing_address.postal_code" value="00000" />
      <input
        type="hidden"
        name="billing_address.country_code"
        value={countryCode}
      />
    </>
  )
}

export default BillingAddress
