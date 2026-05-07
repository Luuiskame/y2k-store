import { Container } from "@medusajs/ui"

import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  return (
    <div data-testid="overview-page-wrapper" className="flex flex-col gap-y-6">
      {/* Header */}
      <div className="flex flex-col small:flex-row small:items-center small:justify-between gap-y-1 pb-4 border-b border-brand-amethyst">
        <span
          className="text-xl-semi"
          data-testid="welcome-message"
          data-value={customer?.first_name}
        >
          Hola {customer?.first_name}
        </span>
        <span className="text-small-regular text-brand-silver-ash">
          Sesión iniciada como{" "}
          <span
            className="font-semibold text-brand-ghost-white"
            data-testid="customer-email"
            data-value={customer?.email}
          >
            {customer?.email}
          </span>
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Perfil"
          value={`${getProfileCompletion(customer)}%`}
          subtitle="completado"
          testId="customer-profile-completion"
          dataValue={getProfileCompletion(customer)}
        />
        <StatCard
          label="Direcciones"
          value={`${customer?.addresses?.length || 0}`}
          subtitle="guardadas"
          testId="addresses-count"
          dataValue={customer?.addresses?.length || 0}
        />
      </div>

      {/* Recent orders */}
      <div className="flex flex-col gap-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-large-semi">Pedidos recientes</h3>
          {orders && orders.length > 0 && (
            <LocalizedClientLink
              href="/account/orders"
              className="text-small-regular text-brand-silver-ash hover:text-brand-ghost-white underline"
            >
              Ver todos
            </LocalizedClientLink>
          )}
        </div>
        <ul className="flex flex-col gap-y-2" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order) => (
              <li
                key={order.id}
                data-testid="order-wrapper"
                data-value={order.id}
              >
                <LocalizedClientLink
                  href={`/account/orders/details/${order.id}`}
                >
                  <Container className="bg-brand-abyss-purple hover:bg-brand-abyss-purple border border-brand-amethyst hover:border-brand-sacred-violet transition-colors flex justify-between items-center p-4 gap-2">
                    <div className="grid grid-cols-2 small:grid-cols-3 grid-rows-2 text-small-regular gap-x-4 gap-y-1 flex-1 min-w-0">
                      <span className="font-semibold">Fecha</span>
                      <span className="font-semibold">Pedido</span>
                      <span className="font-semibold hidden small:block">
                        Total
                      </span>
                      <span data-testid="order-created-date">
                        {new Date(order.created_at).toLocaleDateString(
                          "es-HN",
                          { year: "numeric", month: "short", day: "numeric" }
                        )}
                      </span>
                      <span
                        data-testid="order-id"
                        data-value={order.display_id}
                        className="truncate"
                      >
                        #{order.display_id}
                      </span>
                      <span
                        data-testid="order-amount"
                        className="hidden small:block"
                      >
                        {convertToLocale({
                          amount: order.total,
                          currency_code: order.currency_code,
                        })}
                      </span>
                    </div>
                    <button
                      className="flex items-center justify-between shrink-0"
                      data-testid="open-order-button"
                    >
                      <span className="sr-only">
                        Ver pedido #{order.display_id}
                      </span>
                      <ChevronDown className="-rotate-90" />
                    </button>
                  </Container>
                </LocalizedClientLink>
              </li>
            ))
          ) : (
            <span
              data-testid="no-orders-message"
              className="text-small-regular text-brand-silver-ash"
            >
              Aún no tienes pedidos.
            </span>
          )}
        </ul>
      </div>
    </div>
  )
}

const StatCard = ({
  label,
  value,
  subtitle,
  testId,
  dataValue,
}: {
  label: string
  value: string
  subtitle: string
  testId?: string
  dataValue?: string | number
}) => (
  <div className="border border-brand-amethyst bg-brand-abyss-purple rounded-rounded p-4 flex flex-col gap-y-1">
    <span className="text-small-regular text-brand-silver-ash">{label}</span>
    <span
      className="text-2xl-semi leading-none"
      data-testid={testId}
      data-value={dataValue}
    >
      {value}
    </span>
    <span className="uppercase text-xsmall-regular text-brand-silver-ash">
      {subtitle}
    </span>
  </div>
)

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
