import { ExclamationCircle, Receipt, TruckFast } from "@medusajs/icons"
import { Button, Container, Tabs, Text } from "@medusajs/ui"
import { ReactNode, useState } from "react"
import { Link } from "react-router-dom"

import type { SalesResponse, TrafficResponse } from "../../lib/analytics"
import {
  changeOf,
  countryName,
  deviceLabel,
  flagOf,
  formatMoney,
  formatNumber,
  formatPercent,
  pageLabel,
  paymentMethodLabel,
  ratioOf,
  sourceLabel,
} from "../../lib/analytics-format"
import { BarItem, BarList, ProductThumb } from "./bar-list"
import { ErrorNote, Loading, Section } from "./section"
import { StatGrid, StatTile } from "./stat-tile"
import { TrendChart, TrendTable } from "./trend-chart"

type Query<T> = {
  data?: T
  error: unknown
  isLoading: boolean
  isPlaceholderData: boolean
}

/** Loading, error or content, the same way in every card. */
const Body = <T,>({
  query,
  children,
}: {
  query: Query<T>
  children: (data: T) => ReactNode
}) => {
  if (query.isLoading) {
    return <Loading />
  }
  if (!query.data) {
    return <ErrorNote error={query.error} />
  }
  return <>{children(query.data)}</>
}

const shareOf = (part: number, whole: number) => {
  const ratio = ratioOf(part, whole)
  return ratio === null ? undefined : formatPercent(ratio)
}

/* ------------------------------------------------------------------------ */

const TaskLink = ({
  to,
  icon,
  children,
}: {
  to: string
  icon: ReactNode
  children: ReactNode
}) => (
  <Link
    to={to}
    className="shadow-elevation-card-rest bg-ui-bg-component hover:bg-ui-bg-component-hover focus-visible:shadow-borders-interactive-with-focus flex items-center gap-x-3 rounded-md px-4 py-3 outline-none transition-colors"
  >
    <span className="text-ui-fg-subtle">{icon}</span>
    <Text size="small" leading="compact">
      {children}
    </Text>
  </Link>
)

/** What is waiting on the owner, whatever range is selected. */
export const PendingWork = ({ sales }: { sales: Query<SalesResponse> }) => {
  const pending = sales.data?.pending
  if (!pending) {
    return null
  }

  const tasks = [
    pending.proofs_to_review > 0 && (
      <TaskLink key="proofs" to="/orders" icon={<ExclamationCircle />}>
        <strong>{formatNumber(pending.proofs_to_review)}</strong>{" "}
        {pending.proofs_to_review === 1
          ? "comprobante de transferencia por revisar"
          : "comprobantes de transferencia por revisar"}
      </TaskLink>
    ),
    pending.awaiting_payment > 0 && (
      <TaskLink key="payment" to="/orders" icon={<Receipt />}>
        <strong>{formatNumber(pending.awaiting_payment)}</strong>{" "}
        {pending.awaiting_payment === 1 ? "pedido sin cobrar" : "pedidos sin cobrar"} (
        {formatMoney(pending.awaiting_amount, sales.data!.currency)})
      </TaskLink>
    ),
    pending.to_fulfill > 0 && (
      <TaskLink key="fulfill" to="/orders" icon={<TruckFast />}>
        <strong>{formatNumber(pending.to_fulfill)}</strong>{" "}
        {pending.to_fulfill === 1 ? "pedido sin despachar" : "pedidos sin despachar"}
      </TaskLink>
    ),
  ].filter(Boolean)

  if (tasks.length === 0) {
    return null
  }

  return (
    <Section title="Por atender" description="Pedidos abiertos, sin importar las fechas elegidas">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{tasks}</div>
    </Section>
  )
}

/* ------------------------------------------------------------------------ */

export const Summary = ({
  sales,
  traffic,
  comparison,
}: {
  sales: Query<SalesResponse>
  traffic: Query<TrafficResponse>
  comparison: string
}) => {
  const s = sales.data
  const t = traffic.data
  const money = (value: number) => (s ? formatMoney(value, s.currency) : null)

  const conversion = s && t ? ratioOf(s.totals.orders, t.totals.sessions) : null
  const previousConversion =
    s && t ? ratioOf(s.previous.orders, t.previous.sessions) : null

  return (
    <div
      className={
        sales.isPlaceholderData || traffic.isPlaceholderData
          ? "opacity-60 transition-opacity"
          : "transition-opacity"
      }
    >
      <div className="flex flex-col gap-y-2">
        <Text size="small" leading="compact" className="text-ui-fg-subtle px-1">
          Los cambios se comparan {comparison.replace(/^vs\. /, "con ")}.
        </Text>
        <StatGrid>
          <StatTile
            label="Ventas"
            value={s ? money(s.totals.sales) : null}
            change={s ? changeOf(s.totals.sales, s.previous.sales) : null}
            hint={s && `${formatNumber(s.totals.orders)} pedidos`}
            help="Total de los pedidos del período, sin contar los cancelados. Incluye los pedidos que hacés vos desde tu cuenta."
          />
          <StatTile
            label="Pedidos"
            value={s ? formatNumber(s.totals.orders) : null}
            change={s ? changeOf(s.totals.orders, s.previous.orders) : null}
            hint={s && `${formatNumber(s.totals.units)} unidades`}
            help="Pedidos no cancelados hechos en el período."
          />
          <StatTile
            label="Ticket promedio"
            value={s ? money(s.totals.average_order) : null}
            change={s ? changeOf(s.totals.average_order, s.previous.average_order) : null}
            help="Ventas ÷ pedidos."
          />
          <StatTile
            label="Cobrado"
            value={s ? money(s.totals.collected) : null}
            change={s ? changeOf(s.totals.collected, s.previous.collected) : null}
            hint={s && `${money(s.totals.outstanding)} por cobrar`}
            help="Pagos confirmados de los pedidos del período (transferencias verificadas, pagos capturados), menos reembolsos."
          />
          <StatTile
            label="Visitas"
            value={t ? formatNumber(t.totals.sessions) : null}
            change={t ? changeOf(t.totals.sessions, t.previous.sessions) : null}
            hint={t && `${formatNumber(t.totals.visitors)} personas distintas`}
            help="Sesiones en la tienda. Una sesión termina tras 30 minutos sin actividad. Tus propias visitas cuentan salvo que las excluyas (ver al final)."
          />
          <StatTile
            label="Abrieron WhatsApp"
            value={t ? formatNumber(t.totals.contacted_whatsapp) : null}
            change={
              t ? changeOf(t.totals.contacted_whatsapp, t.previous.contacted_whatsapp) : null
            }
            hint={t && shareOf(t.totals.contacted_whatsapp, t.totals.sessions)?.concat(" de las visitas")}
            help="Visitas que tocaron un botón o enlace de WhatsApp en la tienda."
          />
          <StatTile
            label="Conversión"
            value={conversion === null ? (s && t ? "—" : null) : formatPercent(conversion)}
            change={
              conversion !== null && previousConversion !== null
                ? changeOf(conversion, previousConversion)
                : null
            }
            hint="pedidos por visita"
            help="Pedidos ÷ visitas. Como muchos pedidos los hacés vos por WhatsApp, leelo como cuántos pedidos salen por cada visita a la tienda."
          />
          <StatTile
            label="Clientes"
            value={s ? formatNumber(s.customers.identified) : null}
            hint={
              s &&
              `${formatNumber(s.customers.new)} nuevos · ${formatNumber(
                s.customers.returning
              )} recurrentes`
            }
            help="Clientes distintos del período según el teléfono de envío, no la cuenta: así cuentan bien los pedidos que hacés vos. Recurrente: ya había comprado antes."
          />
        </StatGrid>
        {(!s && sales.error) || (!t && traffic.error) ? (
          <div className="px-1">
            {!s && sales.error ? <ErrorNote error={sales.error} /> : null}
            {!t && traffic.error ? <ErrorNote error={traffic.error} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

type Metric = "sales" | "orders" | "sessions"

const METRIC_TITLES: Record<Metric, string> = {
  sales: "Ventas",
  orders: "Pedidos",
  sessions: "Visitas",
}

export const Trend = ({
  sales,
  traffic,
}: {
  sales: Query<SalesResponse>
  traffic: Query<TrafficResponse>
}) => {
  const [metric, setMetric] = useState<Metric>("sales")
  const [asTable, setAsTable] = useState(false)

  const query = metric === "sessions" ? traffic : sales

  const tabs = (
    <div className="flex items-center gap-x-2">
      <Tabs value={metric} onValueChange={(value) => setMetric(value as Metric)}>
        <Tabs.List>
          {(Object.keys(METRIC_TITLES) as Metric[]).map((key) => (
            <Tabs.Trigger key={key} value={key}>
              {METRIC_TITLES[key]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
      <Button size="small" variant="secondary" onClick={() => setAsTable((v) => !v)}>
        {asTable ? "Ver gráfico" : "Ver tabla"}
      </Button>
    </div>
  )

  return (
    <Section
      title="En el tiempo"
      description="Este período contra el anterior"
      actions={tabs}
      dimmed={query.isPlaceholderData}
    >
      <Body query={query as Query<SalesResponse | TrafficResponse>}>
        {(data) => {
          const range = data.range
          const currency = sales.data?.currency ?? "hnl"

          const pick = (side: "current" | "previous") => {
            if (metric === "sessions") {
              const series = (data as TrafficResponse).series[side]
              return { buckets: series.buckets, values: series.sessions }
            }
            const series = (data as SalesResponse).series[side]
            return {
              buckets: series.buckets,
              values: metric === "sales" ? series.sales : series.orders,
            }
          }

          const isMoney = metric === "sales"
          const format = (value: number) =>
            isMoney ? formatMoney(value, currency) : formatNumber(value)
          const formatTick = (value: number) =>
            isMoney
              ? formatMoney(value, currency, { compact: true })
              : formatNumber(value, { compact: true })

          const props = {
            granularity: range.granularity,
            current: pick("current"),
            previous: pick("previous"),
            currentDay: range.from,
            previousDay: range.previous_from,
            format,
          }

          return asTable ? (
            <TrendTable {...props} />
          ) : (
            <TrendChart
              {...props}
              formatTick={formatTick}
              integer={!isMoney}
              label={`${METRIC_TITLES[metric]} por ${
                range.granularity === "hour"
                  ? "hora"
                  : range.granularity === "day"
                  ? "día"
                  : "mes"
              }`}
            />
          )
        }}
      </Body>
    </Section>
  )
}

/* ------------------------------------------------------------------------ */

export const Behavior = ({ traffic }: { traffic: Query<TrafficResponse> }) => (
  <Section
    title="Qué hacen las visitas"
    description="Parte de las visitas que llegó a cada paso"
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ totals }) => {
        const steps: [string, number][] = [
          ["Vieron un producto", totals.viewed_product],
          ["Agregaron al carrito", totals.added_to_cart],
          ["Llegaron al checkout", totals.reached_checkout],
          ["Abrieron WhatsApp", totals.contacted_whatsapp],
          ["Compraron en la web", totals.purchased],
        ]
        return (
          <div className="flex flex-col gap-y-4">
            <BarList
              max={totals.sessions}
              empty="Todavía no hay visitas en este período."
              items={
                totals.sessions === 0
                  ? []
                  : steps.map(([label, value]) => ({
                      key: label,
                      label,
                      value,
                      display: formatNumber(value),
                      detail: shareOf(value, totals.sessions),
                    }))
              }
            />
            <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
              {formatNumber(totals.sessions)} visitas ·{" "}
              {formatNumber(totals.pageviews)} páginas vistas ·{" "}
              {formatNumber(totals.whatsapp_clicks)} toques a WhatsApp ·{" "}
              {formatNumber(totals.new_visitors)} visitantes nuevos,{" "}
              {formatNumber(totals.returning_visitors)} que ya habían venido
            </Text>
          </div>
        )
      }}
    </Body>
  </Section>
)

export const Sources = ({ traffic }: { traffic: Query<TrafficResponse> }) => (
  <Section
    title="De dónde llegan"
    description="Por sesión. Instagram y Facebook se reconocen aunque no manden referencia."
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ sources, totals }) => (
        <BarList
          empty="Todavía no hay visitas en este período."
          items={sources.map((source) => ({
            key: source.key,
            label: sourceLabel(source.key),
            value: source.count,
            display: formatNumber(source.count),
            detail: shareOf(source.count, totals.sessions),
          }))}
        />
      )}
    </Body>
  </Section>
)

/* ------------------------------------------------------------------------ */

const productLink = (id: string | null | undefined, label: ReactNode) =>
  id ? (
    <Link to={`/products/${id}`} className="hover:underline">
      {label}
    </Link>
  ) : (
    label
  )

export const BestSellers = ({ sales }: { sales: Query<SalesResponse> }) => (
  <Section title="Más vendidos" description="Unidades en pedidos no cancelados" dimmed={sales.isPlaceholderData}>
    <Body query={sales}>
      {({ products, currency }) => (
        <BarList
          empty="Sin ventas en este período."
          items={products.map((product) => ({
            key: product.product_id ?? product.title,
            leading: <ProductThumb src={product.thumbnail} alt={product.title} />,
            label: productLink(product.product_id, product.title),
            value: product.units,
            display: `${formatNumber(product.units)} u.`,
            detail: formatMoney(product.sales, currency),
          }))}
        />
      )}
    </Body>
  </Section>
)

export const MostViewed = ({ traffic }: { traffic: Query<TrafficResponse> }) => (
  <Section
    title="Más vistos"
    description="Visitas a la página del producto y toques a WhatsApp desde ella"
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ products }) => (
        <BarList
          empty="Nadie vio productos en este período."
          items={products.map((item) => ({
            key: item.handle,
            leading: (
              <ProductThumb
                src={item.product?.thumbnail ?? null}
                alt={item.product?.title ?? item.handle}
              />
            ),
            label: productLink(
              item.product?.id,
              pageLabel(`/products/${item.handle}`, item.product)
            ),
            value: item.views,
            display: `${formatNumber(item.views)} vistas`,
            detail: item.whatsapp_clicks
              ? `${formatNumber(item.whatsapp_clicks)} WhatsApp`
              : undefined,
          }))}
        />
      )}
    </Body>
  </Section>
)

/* ------------------------------------------------------------------------ */

export const Provinces = ({ sales }: { sales: Query<SalesResponse> }) => (
  <Section title="Ventas por departamento" description="Según la dirección de envío" dimmed={sales.isPlaceholderData}>
    <Body query={sales}>
      {({ provinces, currency }) => (
        <BarList
          empty="Sin ventas en este período."
          items={provinces.map((province) => ({
            key: province.province,
            label: province.province,
            value: province.sales,
            display: formatMoney(province.sales, currency),
            detail: `${formatNumber(province.orders)} ped.`,
          }))}
        />
      )}
    </Body>
  </Section>
)

export const PaymentMethods = ({ sales }: { sales: Query<SalesResponse> }) => (
  <Section title="Métodos de pago" description="Vendido y, al lado, lo ya cobrado" dimmed={sales.isPlaceholderData}>
    <Body query={sales}>
      {({ methods, currency }) => (
        <BarList
          empty="Sin ventas en este período."
          items={methods.map((method) => ({
            key: method.provider_id ?? "none",
            label: paymentMethodLabel(method.provider_id),
            value: method.sales,
            display: formatMoney(method.sales, currency),
            detail: `${formatMoney(method.collected, currency)} cobrado`,
          }))}
        />
      )}
    </Body>
  </Section>
)

export const Audience = ({ traffic }: { traffic: Query<TrafficResponse> }) => (
  <Section title="Dispositivos y ciudades" description="Por sesión" dimmed={traffic.isPlaceholderData}>
    <Body query={traffic}>
      {({ devices, cities, totals }) => (
        <div className="flex flex-col gap-y-5">
          <BarList
            empty="Todavía no hay visitas en este período."
            items={devices.map((device) => ({
              key: device.key,
              label: deviceLabel(device.key),
              value: device.count,
              display: formatNumber(device.count),
              detail: shareOf(device.count, totals.sessions),
            }))}
          />
          {cities.length > 0 && (
            <BarList
              empty=""
              items={cities.map((city) => {
                const [country, name] = city.key.split("|")
                return {
                  key: city.key,
                  label: name ? `${flagOf(country)} ${name}`.trim() : "Otras ciudades",
                  value: city.count,
                  display: formatNumber(city.count),
                  detail:
                    country && country !== "HN" && country !== "--"
                      ? countryName(country)
                      : undefined,
                }
              })}
            />
          )}
        </div>
      )}
    </Body>
  </Section>
)

const pageItems = (pages: TrafficResponse["landing_pages"]): BarItem[] =>
  pages.map((page) => ({
    key: page.key,
    label: pageLabel(page.key, page.product),
    value: page.count,
    display: formatNumber(page.count),
  }))

export const LandingPages = ({ traffic }: { traffic: Query<TrafficResponse> }) => (
  <Section title="Páginas de entrada" description="Dónde empieza cada visita" dimmed={traffic.isPlaceholderData}>
    <Body query={traffic}>
      {({ landing_pages }) => (
        <BarList empty="Todavía no hay visitas en este período." items={pageItems(landing_pages)} />
      )}
    </Body>
  </Section>
)

export const WhatsappPages = ({ traffic }: { traffic: Query<TrafficResponse> }) => (
  <Section
    title="Desde dónde abren WhatsApp"
    description="Toques a WhatsApp por página"
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ whatsapp_pages }) => (
        <BarList empty="Nadie abrió WhatsApp en este período." items={pageItems(whatsapp_pages)} />
      )}
    </Body>
  </Section>
)

/* ------------------------------------------------------------------------ */

export const Notes = ({ storefrontUrl }: { storefrontUrl: string | null }) => {
  const optOut = storefrontUrl ? `${storefrontUrl.replace(/\/$/, "")}/?notrack=1` : null

  return (
    <Container className="flex flex-col gap-y-2 px-6 py-4">
      <Text size="small" leading="compact" weight="plus">
        Para que tus visitas no cuenten
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        Como hacés pedidos desde la tienda, tus propias visitas inflarían las
        estadísticas. Abrí{" "}
        {optOut ? (
          <a
            href={optOut}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ui-fg-interactive hover:underline"
          >
            {optOut}
          </a>
        ) : (
          <code>/?notrack=1</code>
        )}{" "}
        una vez en cada celular y computadora que usás. Con{" "}
        <code>?notrack=0</code> se vuelve a contar. Los pedidos que hacés
        siempre cuentan como ventas.
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        Todas las fechas y horas son de Honduras. No se guardan direcciones IP
        ni datos personales de las visitas.
      </Text>
    </Container>
  )
}
