import { Container, Heading, Input, Label, Select, Text, clx } from "@medusajs/ui"
import type { ReactNode } from "react"

import { useT } from "../../i18n/use-t"
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
}) => {
  const words = useT().manualOrder.customer

  return (
  <div className={clx("flex flex-col gap-1.5", className)}>
    <div className="flex items-baseline gap-1.5">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      {optional && (
        <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
          {words.optional}
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
}

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
  const words = useT().manualOrder.customer
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
        <Heading level="h2">{words.heading}</Heading>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {words.hint}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2">
        <Field id="mo-name" label={words.fullName} error={errorOf("full_name")}>
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
          label={words.phone}
          error={errorOf("phone")}
          hint={number ? words.writesTo(number.display) : words.phoneHint}
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
            {words.whereTo}
          </Text>
          <div className="y2k-chips" role="group" aria-label={words.quickPlaces}>
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

        <Field id="mo-city" label={words.city} error={errorOf("city")}>
          <Input
            id="mo-city"
            autoComplete="off"
            autoCapitalize="words"
            value={customer.city}
            onChange={text("city")}
            aria-invalid={!!errorOf("city")}
          />
        </Field>

        <Field id="mo-province" label={words.province} error={errorOf("province")}>
          <Select
            value={customer.province || undefined}
            onValueChange={(province) => onChange({ province })}
          >
            <Select.Trigger id="mo-province" aria-invalid={!!errorOf("province")}>
              <Select.Value placeholder={words.chooseProvince} />
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
          label={words.address}
          error={errorOf("address_1")}
          className="md:col-span-2"
        >
          <Input
            id="mo-address"
            autoComplete="off"
            placeholder={words.addressPlaceholder}
            value={customer.address_1}
            onChange={text("address_1")}
            aria-invalid={!!errorOf("address_1")}
          />
        </Field>

        <Field id="mo-ref1" label={words.reference} optional>
          <Input
            id="mo-ref1"
            autoComplete="off"
            placeholder={words.referencePlaceholder}
            value={customer.address_2}
            onChange={text("address_2")}
          />
        </Field>

        <Field id="mo-ref2" label={words.otherReference} optional>
          <Input
            id="mo-ref2"
            autoComplete="off"
            value={customer.company}
            onChange={text("company")}
          />
        </Field>

        <Field
          id="mo-email"
          label={words.email}
          optional
          error={errorOf("email")}
          hint={words.emailHint}
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
