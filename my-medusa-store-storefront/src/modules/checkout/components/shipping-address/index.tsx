import { joinFullName, splitFullName } from "@lib/util/full-name"
import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import { useParams } from "next/navigation"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import DestinationSelect from "../destination-select"

/**
 * Dirección de envío para Honduras. Mapeo a los campos de Medusa:
 *   city       → Poblado / zona (con el municipio cuando difiere)
 *   province   → Departamento
 *   address_1  → Dirección exacta
 *   address_2  → Referencia 1
 *   company    → Referencia 2 (opcional)
 * `postal_code` va fijo en "00000" porque en Honduras no se usa.
 */
const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const params = useParams() as { countryCode?: string }

  const countryCode =
    params.countryCode ||
    cart?.shipping_address?.country_code ||
    cart?.region?.countries?.[0]?.iso_2 ||
    "hn"

  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.full_name": joinFullName(
      cart?.shipping_address?.first_name,
      cart?.shipping_address?.last_name
    ),
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.address_2": cart?.shipping_address?.address_2 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.full_name": joinFullName(
          address?.first_name,
          address?.last_name
        ),
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.address_2": address?.address_2 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    // Ensure cart is not null and has a shipping_address before setting form data
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    }

    if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart]) // Add cart as a dependency

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
    formData["shipping_address.full_name"]
  )

  return (
    <>
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-4 small:p-5 bg-brand-void-black border border-brand-amethyst rounded-rounded">
          <p className="text-small-regular text-brand-ghost-white">
            {`Hola ${customer.first_name}, ¿querés usar una de tus direcciones guardadas?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(
                {
                  ...formData,
                  "shipping_address.first_name": first_name,
                  "shipping_address.last_name": last_name,
                  "shipping_address.postal_code": "00000",
                  "shipping_address.country_code": countryCode,
                },
                (_, key) => key.replace("shipping_address.", "")
              ) as unknown as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}
      <div className="grid grid-cols-1 gap-4">
        <DestinationSelect
          prefix="shipping_address"
          city={formData["shipping_address.city"]}
          province={formData["shipping_address.province"]}
          onSelect={(city, province) =>
            setFormData((prevState: Record<string, any>) => ({
              ...prevState,
              "shipping_address.city": city,
              "shipping_address.province": province,
            }))
          }
          required
          data-testid="shipping-destination-select"
        />
        <Input
          label="Dirección exacta"
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
        <Input
          label="Referencia 1 (cómo llegar)"
          name="shipping_address.address_2"
          autoComplete="address-line2"
          value={formData["shipping_address.address_2"]}
          onChange={handleChange}
          required
          data-testid="shipping-reference-1-input"
        />
        <Input
          label="Referencia 2 (opcional)"
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          data-testid="shipping-reference-2-input"
        />
        <Input
          label="Nombre completo"
          name="shipping_address.full_name"
          autoComplete="name"
          value={formData["shipping_address.full_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-full-name-input"
        />
      </div>

      {/* Medusa guarda nombre y apellido por separado, y en Honduras no se usa
          código postal ni hace falta elegir país. */}
      <input
        type="hidden"
        name="shipping_address.first_name"
        value={first_name}
      />
      <input
        type="hidden"
        name="shipping_address.last_name"
        value={last_name}
      />
      <input type="hidden" name="shipping_address.postal_code" value="00000" />
      <input
        type="hidden"
        name="shipping_address.country_code"
        value={countryCode}
      />

      <div className="my-6 small:my-8">
        <Checkbox
          label="Usar la misma dirección para la facturación"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>
      <div className="grid grid-cols-1 small:grid-cols-2 gap-4 mb-4">
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          title="Ingresá un correo electrónico válido."
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        <Input
          label="Número de teléfono"
          name="shipping_address.phone"
          type="tel"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          required
          data-testid="shipping-phone-input"
        />
      </div>
    </>
  )
}

export default ShippingAddress
