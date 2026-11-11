import { Container, Heading, Input, Label, Select, Text, clx } from "@medusajs/ui"
import type { ReactNode } from "react"

import {
  CustomerForm,
  FormError,
  HONDURAS_DEPARTMENTS,
  QUICK_PLACES,
} from "../../lib/manual-order-form"
import { toWhatsappNumber } from "../../lib/whatsapp"

const Field = ({
  id,
  label,
  optional = false,
  error,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  error?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <div className={clx("flex flex-col gap-1.5", className)}>
    <div className="flex items-baseline gap-1.5">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      {optional && (
        <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
          opcional
        </Text>
      )}
    </div>
    {children}
    {error ? (
      <Text size="xsmall" leading="compact" className="text-ui-fg-error" role="alert">
        {error}
      </Text>
    ) : (
      hint && (
        <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
          {hint}
        </Text>
      )
    )}
  </div>
)

/**
 * Who the order is for and where it goes. The same fields the storefront's
 * checkout asks for, mapped to Medusa's address the same way (town in
 * `city`, department in `province`, the two references in `address_2` and
 * `company`), so an order made here reads like one made there.
 */
export const CustomerFormSection = ({
  customer,
  errors,
  showErrors,
  onChange,
}: {
  customer: CustomerForm
  errors: FormError[]
  /** Errors stay quiet until the owner has tried to move on. */
  showErrors: boolean
  onChange: (patch: Partial<CustomerForm>) => void
}) => {
  const errorOf = (field: keyof CustomerForm) =>
    showErrors ? errors.find((error) => error.field === field)?.message : undefined

  const number = toWhatsappNumber(customer.phone, customer.country_code)
  // A department typed in the storefront that is not in the list still shows.
  const departments: string[] = [...HONDURAS_DEPARTMENTS]
  if (customer.province && !departments.includes(customer.province)) {
    departments.unshift(customer.province)
  }

  const text =
    (field: keyof CustomerForm) =>
    (event: { target: { value: string } }) =>
      onChange({ [field]: event.target.value })

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-1 px-6 py-4">
        <Heading level="h2">Cliente y entrega</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Lo que necesita quien entrega para encontrarlo y cobrarle.
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
        <Field id="mo-name" label="Nombre completo" error={errorOf("full_name")}>
          <Input
            id="mo-name"
            autoComplete="off"
            autoCapitalize="words"
            value={customer.full_name}
            onChange={text("full_name")}
            aria-invalid={!!errorOf("full_name")}
          />
        </Field>

        <Field
          id="mo-phone"
          label="Teléfono (WhatsApp)"
          error={errorOf("phone")}
          hint={number ? `Se escribe a ${number.display}` : "8 dígitos; con +código si es de otro país"}
        >
          <Input
            id="mo-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="9876-5432"
            value={customer.phone}
            onChange={text("phone")}
            aria-invalid={!!errorOf("phone")}
          />
        </Field>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Text size="small" leading="compact" weight="plus">
            ¿A dónde va?
          </Text>
          <div className="y2k-chips" role="group" aria-label="Ciudades frecuentes">
            {QUICK_PLACES.map((place) => (
              <button
                key={place.label}
                type="button"
                className="y2k-chip"
                aria-pressed={
                  customer.city === place.city && customer.province === place.province
                }
                onClick={() =>
                  onChange({ city: place.city, province: place.province })
                }
              >
                {place.label}
              </button>
            ))}
          </div>
        </div>

        <Field id="mo-city" label="Ciudad o poblado" error={errorOf("city")}>
          <Input
            id="mo-city"
            autoComplete="off"
            autoCapitalize="words"
            value={customer.city}
            onChange={text("city")}
            aria-invalid={!!errorOf("city")}
          />
        </Field>

        <Field id="mo-province" label="Departamento" error={errorOf("province")}>
          <Select
            value={customer.province || undefined}
            onValueChange={(province) => onChange({ province })}
          >
            <Select.Trigger id="mo-province" aria-invalid={!!errorOf("province")}>
              <Select.Value placeholder="Elegir departamento" />
            </Select.Trigger>
            <Select.Content>
              {departments.map((department) => (
                <Select.Item key={department} value={department}>
                  {department}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>

        <Field
          id="mo-address"
          label="Dirección exacta"
          error={errorOf("address_1")}
          className="md:col-span-2"
        >
          <Input
            id="mo-address"
            autoComplete="off"
            placeholder="Colonia, calle, número de casa"
            value={customer.address_1}
            onChange={text("address_1")}
            aria-invalid={!!errorOf("address_1")}
          />
        </Field>

        <Field id="mo-ref1" label="Referencia" optional>
          <Input
            id="mo-ref1"
            autoComplete="off"
            placeholder="Cómo llegar"
            value={customer.address_2}
            onChange={text("address_2")}
          />
        </Field>

        <Field id="mo-ref2" label="Otra referencia" optional>
          <Input
            id="mo-ref2"
            autoComplete="off"
            value={customer.company}
            onChange={text("company")}
          />
        </Field>

        <Field
          id="mo-email"
          label="Correo"
          optional
          error={errorOf("email")}
          hint="Con correo, el cliente recibe los avisos de envío y entrega."
          className="md:col-span-2"
        >
          <Input
            id="mo-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            value={customer.email}
            onChange={text("email")}
            aria-invalid={!!errorOf("email")}
          />
        </Field>
      </div>
    </Container>
  )
}
