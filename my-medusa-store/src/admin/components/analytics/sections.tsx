import { ExclamationCircle, Receipt, TruckFast } from "@medusajs/icons"
import { Button, Container, Tabs, Text } from "@medusajs/ui"
import { ReactNode, useState } from "react"
import { Link } from "react-router-dom"

import { useT } from "../../i18n/use-t"
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
  const t = useT()
  const pending = sales.data?.pending
  if (!pending) {
    return null
  }

  const tasks = [
    pending.proofs_to_review > 0 && (
      <TaskLink key="proofs" to="/orders" icon={<ExclamationCircle />}>
        <strong>{formatNumber(pending.proofs_to_review)}</strong>{" "}
        {t.analytics.pending.proofs(pending.proofs_to_review)}
      </TaskLink>
    ),
    pending.awaiting_payment > 0 && (
      <TaskLink key="payment" to="/orders" icon={<Receipt />}>
        <strong>{formatNumber(pending.awaiting_payment)}</strong>{" "}
        {t.analytics.pending.unpaid(pending.awaiting_payment)} (
        {formatMoney(pending.awaiting_amount, sales.data!.currency)})
      </TaskLink>
    ),
    pending.to_fulfill > 0 && (
      <TaskLink key="fulfill" to="/orders" icon={<TruckFast />}>
        <strong>{formatNumber(pending.to_fulfill)}</strong>{" "}
        {t.analytics.pending.toShip(pending.to_fulfill)}
      </TaskLink>
    ),
  ].filter(Boolean)

  if (tasks.length === 0) {
    return null
  }

  return (
    <Section title={t.analytics.pending.title} description={t.analytics.pending.description}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{tasks}</div>
    </Section>
  )
}

/* ------------------------------------------------------------------------ */

/**
 * Visits and customers of the period. What was sold, how many orders and
 * what was collected are in the hero above (hero.tsx).
 */
export const Summary = ({
  sales,
  traffic,
  comparison,
}: {
  sales: Query<SalesResponse>
  traffic: Query<TrafficResponse>
  /** What the period is compared with: "ayer a esta hora". */
  comparison: string
}) => {
  const t = useT()
  const words = t.analytics.summary
  const s = sales.data
  const v = traffic.data

  const whatsappShare = (part: number, whole: number) => {
    const share = shareOf(part, whole)
    return share === undefined ? undefined : words.ofVisits(share)
  }

  const conversion = s && v ? ratioOf(s.totals.orders, v.totals.sessions) : null
  const previousConversion =
    s && v ? ratioOf(s.previous.orders, v.previous.sessions) : null

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
          {t.analytics.comparedWith(comparison)}
        </Text>
        <StatGrid>
          <StatTile
            label={words.visits}
            value={v ? formatNumber(v.totals.sessions) : null}
            change={v ? changeOf(v.totals.sessions, v.previous.sessions) : null}
            hint={v && words.visitsHint(v.totals.visitors, formatNumber(v.totals.visitors))}
            help={words.visitsHelp}
          />
          <StatTile
            label={words.openedWhatsapp}
            value={v ? formatNumber(v.totals.contacted_whatsapp) : null}
            change={
              v ? changeOf(v.totals.contacted_whatsapp, v.previous.contacted_whatsapp) : null
            }
            hint={v && whatsappShare(v.totals.contacted_whatsapp, v.totals.sessions)}
            help={words.whatsappHelp}
          />
          <StatTile
            label={words.conversion}
            value={conversion === null ? (s && v ? "—" : null) : formatPercent(conversion)}
            change={
              conversion !== null && previousConversion !== null
                ? changeOf(conversion, previousConversion)
                : null
            }
            hint={words.conversionHint}
            help={words.conversionHelp}
          />
          <StatTile
            label={words.customers}
            value={s ? formatNumber(s.customers.identified) : null}
            hint={
              s &&
              words.customersHint(
                formatNumber(s.customers.new),
                formatNumber(s.customers.returning)
              )
            }
            help={words.customersHelp}
          />
        </StatGrid>
        {(!s && sales.error) || (!v && traffic.error) ? (
          <div className="px-1">
            {!s && sales.error ? <ErrorNote error={sales.error} /> : null}
            {!v && traffic.error ? <ErrorNote error={traffic.error} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

type Metric = "sales" | "orders" | "sessions"

const METRICS: Metric[] = ["sales", "orders", "sessions"]

export const Trend = ({
  sales,
  traffic,
}: {
  sales: Query<SalesResponse>
  traffic: Query<TrafficResponse>
}) => {
  const t = useT()
  const words = t.analytics.trend
  const [metric, setMetric] = useState<Metric>("sales")
  const [asTable, setAsTable] = useState(false)

  const query = metric === "sessions" ? traffic : sales

  const tabs = (
    <div className="flex items-center gap-x-2">
      <Tabs value={metric} onValueChange={(value) => setMetric(value as Metric)}>
        <Tabs.List>
          {METRICS.map((key) => (
            <Tabs.Trigger key={key} value={key}>
              {words.metrics[key]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
      <Button size="small" variant="secondary" onClick={() => setAsTable((v) => !v)}>
        {asTable ? words.showChart : words.showTable}
      </Button>
    </div>
  )

  return (
    <Section
      title={words.title}
      description={words.description}
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
              label={words.per(words.metrics[metric], range.granularity)}
            />
          )
        }}
      </Body>
    </Section>
  )
}

/* ------------------------------------------------------------------------ */

export const Behavior = ({ traffic }: { traffic: Query<TrafficResponse> }) => {
  const t = useT()
  const words = t.analytics.behavior

  return (
  <Section
    title={words.title}
    description={words.description}
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ totals }) => {
        const steps: [string, number][] = [
          [words.viewedProduct, totals.viewed_product],
          [words.addedToCart, totals.added_to_cart],
          [words.reachedCheckout, totals.reached_checkout],
          [words.openedWhatsapp, totals.contacted_whatsapp],
          [words.purchased, totals.purchased],
        ]
        return (
          <div className="flex flex-col gap-y-4">
            <BarList
              max={totals.sessions}
              empty={t.analytics.noVisits}
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
              {words.footer(
                {
                  sessions: totals.sessions,
                  pageviews: totals.pageviews,
                  whatsappClicks: totals.whatsapp_clicks,
                  fresh: totals.new_visitors,
                  returning: totals.returning_visitors,
                },
                formatNumber
              )}
            </Text>
          </div>
        )
      }}
    </Body>
  </Section>
  )
}

export const Sources = ({ traffic }: { traffic: Query<TrafficResponse> }) => {
  const t = useT()

  return (
  <Section
    title={t.analytics.sources.title}
    description={t.analytics.sources.description}
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ sources, totals }) => (
        <BarList
          empty={t.analytics.noVisits}
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
}

/* ------------------------------------------------------------------------ */

const productLink = (id: string | null | undefined, label: ReactNode) =>
  id ? (
    <Link to={`/products/${id}`} className="hover:underline">
      {label}
    </Link>
  ) : (
    label
  )

export const BestSellers = ({ sales }: { sales: Query<SalesResponse> }) => {
  const t = useT()

  return (
  <Section title={t.analytics.bestSellers.title} description={t.analytics.bestSellers.description} dimmed={sales.isPlaceholderData}>
    <Body query={sales}>
      {({ products, currency }) => (
        <BarList
          empty={t.analytics.noSales}
          items={products.map((product) => ({
            key: product.product_id ?? product.title,
            leading: <ProductThumb src={product.thumbnail} alt={product.title} />,
            label: productLink(product.product_id, product.title),
            value: product.units,
            display: t.analytics.hero.units(product.units, formatNumber(product.units)),
            detail: formatMoney(product.sales, currency),
          }))}
        />
      )}
    </Body>
  </Section>
  )
}

export const MostViewed = ({ traffic }: { traffic: Query<TrafficResponse> }) => {
  const t = useT()

  return (
  <Section
    title={t.analytics.mostViewed.title}
    description={t.analytics.mostViewed.description}
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ products }) => (
        <BarList
          empty={t.analytics.mostViewed.empty}
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
            display: t.analytics.mostViewed.views(item.views, formatNumber(item.views)),
            detail: item.whatsapp_clicks
              ? `${formatNumber(item.whatsapp_clicks)} WhatsApp`
              : undefined,
          }))}
        />
      )}
    </Body>
  </Section>
  )
}

/* ------------------------------------------------------------------------ */

export const Provinces = ({ sales }: { sales: Query<SalesResponse> }) => {
  const t = useT()

  return (
  <Section title={t.analytics.provinces.title} description={t.analytics.provinces.description} dimmed={sales.isPlaceholderData}>
    <Body query={sales}>
      {({ provinces, currency }) => (
        <BarList
          empty={t.analytics.noSales}
          items={provinces.map((province) => ({
            key: province.province,
            label: province.province,
            value: province.sales,
            display: formatMoney(province.sales, currency),
            detail: t.analytics.provinces.orders(formatNumber(province.orders)),
          }))}
        />
      )}
    </Body>
  </Section>
  )
}

export const PaymentMethods = ({ sales }: { sales: Query<SalesResponse> }) => {
  const t = useT()

  return (
  <Section title={t.analytics.methods.title} description={t.analytics.methods.description} dimmed={sales.isPlaceholderData}>
    <Body query={sales}>
      {({ methods, currency }) => (
        <BarList
          empty={t.analytics.noSales}
          items={methods.map((method) => ({
            key: method.provider_id ?? "none",
            label: paymentMethodLabel(method.provider_id),
            value: method.sales,
            display: formatMoney(method.sales, currency),
            detail: t.analytics.methods.collected(formatMoney(method.collected, currency)),
          }))}
        />
      )}
    </Body>
  </Section>
  )
}

export const Audience = ({ traffic }: { traffic: Query<TrafficResponse> }) => {
  const t = useT()

  return (
  <Section title={t.analytics.audience.title} description={t.analytics.audience.description} dimmed={traffic.isPlaceholderData}>
    <Body query={traffic}>
      {({ devices, cities, totals }) => (
        <div className="flex flex-col gap-y-5">
          <BarList
            empty={t.analytics.noVisits}
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
                  label: name ? `${flagOf(country)} ${name}`.trim() : t.analytics.audience.otherCities,
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
}

const pageItems = (pages: TrafficResponse["landing_pages"]): BarItem[] =>
  pages.map((page) => ({
    key: page.key,
    label: pageLabel(page.key, page.product),
    value: page.count,
    display: formatNumber(page.count),
  }))

export const LandingPages = ({ traffic }: { traffic: Query<TrafficResponse> }) => {
  const t = useT()

  return (
  <Section title={t.analytics.landing.title} description={t.analytics.landing.description} dimmed={traffic.isPlaceholderData}>
    <Body query={traffic}>
      {({ landing_pages }) => (
        <BarList empty={t.analytics.noVisits} items={pageItems(landing_pages)} />
      )}
    </Body>
  </Section>
  )
}

export const WhatsappPages = ({ traffic }: { traffic: Query<TrafficResponse> }) => {
  const t = useT()

  return (
  <Section
    title={t.analytics.whatsappPages.title}
    description={t.analytics.whatsappPages.description}
    dimmed={traffic.isPlaceholderData}
  >
    <Body query={traffic}>
      {({ whatsapp_pages }) => (
        <BarList empty={t.analytics.whatsappPages.empty} items={pageItems(whatsapp_pages)} />
      )}
    </Body>
  </Section>
  )
}

/* ------------------------------------------------------------------------ */

export const Notes = ({ storefrontUrl }: { storefrontUrl: string | null }) => {
  const t = useT()
  const words = t.analytics.notes
  const optOut = storefrontUrl ? `${storefrontUrl.replace(/\/$/, "")}/?notrack=1` : null

  return (
    <Container className="flex flex-col gap-y-2 px-6 py-4">
      <Text size="small" leading="compact" weight="plus">
        {words.title}
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {words.before}{" "}
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
        {words.middle} <code>?notrack=0</code> {words.after}
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {words.privacy}
      </Text>
    </Container>
  )
}
