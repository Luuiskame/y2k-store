import type { Knex } from "knex"

import { Granularity, Period, STORE_TIME_ZONE } from "./time"

/**
 * Sales figures for the dashboard, aggregated by Postgres.
 *
 * Deliberately raw SQL rather than `query.graph`: the graph API can only hand
 * back orders, and totals, series and rankings would mean loading every order
 * of the period with its items and payments to add them up here. On Neon,
 * whose transfer limit has already taken the shop down once, that cost grows
 * with every sale. These queries return one row of aggregates whatever the
 * period holds. The social-proof count counts orders the same way.
 *
 * The price is coupling to the order and payment modules' tables. Everything
 * that depends on them is in this file, and was checked against Medusa 2.13.1.
 *
 * What counts as a sale: an order that is not a draft, not canceled and not
 * deleted, whoever placed it. Most orders are placed by the owner, from their
 * own account, for customers who ordered over WhatsApp or Instagram; those are
 * sales like any other.
 *
 * Amounts are what Medusa stores, in the currency's main unit (L 450.00 is
 * 450), never cents.
 */

/**
 * The order's total from its summary at the current version. A canceled or
 * edited order gets a new version with a new summary; the old ones stay.
 */
const SUMMARY_JOIN = `
  left join lateral (
    select s.totals
    from order_summary s
    where s.order_id = o.id and s.version <= o.version and s.deleted_at is null
    order by s.version desc
    limit 1
  ) summary on true`

/**
 * Money actually received, from the payment module's captures and refunds.
 *
 * Not from the summary's `paid_total`: the BAC "Confirmar pago" route captures
 * through the payment module directly, which records the capture but never
 * adds the order transaction that `paid_total` is built from. For those orders
 * the summary says nothing was paid. The capture rows are right for every
 * payment method.
 */
const PAYMENTS_JOIN = `
  left join lateral (
    select
      (array_agg(p.provider_id order by p.canceled_at desc nulls first, p.created_at desc))[1] as provider_id,
      sum(coalesce((select sum(c.amount) from capture c where c.payment_id = p.id and c.deleted_at is null), 0)) as captured,
      sum(coalesce((select sum(r.amount) from refund r where r.payment_id = p.id and r.deleted_at is null), 0)) as refunded
    from order_payment_collection opc
    join payment_collection pc on pc.id = opc.payment_collection_id and pc.deleted_at is null
    join payment p on p.payment_collection_id = pc.id and p.deleted_at is null
    where opc.order_id = o.id and opc.deleted_at is null
  ) paid on true`

const ORDER_TOTAL = `coalesce((summary.totals ->> 'current_order_total')::numeric, 0)`

const COLLECTED = `coalesce(paid.captured, 0) - coalesce(paid.refunded, 0)`

/**
 * The customer behind an order is the phone on its shipping address, last
 * eight digits (a Honduran number without the 504 prefix, however it was
 * typed). Not the account: when the owner places an order for someone, the
 * account is the owner's, and every customer would collapse into one.
 */
const phoneKey = (column: string) =>
  `nullif(right(regexp_replace(coalesce(${column}, ''), '[^0-9]', '', 'g'), 8), '')`

const IS_SALE = `
  o.deleted_at is null
  and o.is_draft_order = false
  and o.status not in ('canceled', 'draft')`

const BUCKET_FORMAT: Record<Granularity, string> = {
  hour: "HH24",
  day: "YYYY-MM-DD",
  month: "YYYY-MM",
}

const REPORT_SQL = `
with bounds as (
  select
    cast(? as timestamptz) as cur_start,
    cast(? as timestamptz) as cur_end,
    cast(? as timestamptz) as prev_start,
    cast(? as timestamptz) as prev_end
),
sales as (
  select
    o.id,
    o.version,
    o.created_at,
    o.created_at >= b.cur_start as is_current,
    ${ORDER_TOTAL} as total,
    ${COLLECTED} as collected,
    paid.provider_id,
    nullif(btrim(addr.province), '') as province,
    ${phoneKey("addr.phone")} as phone
  from "order" o
  cross join bounds b
  ${SUMMARY_JOIN}
  ${PAYMENTS_JOIN}
  left join order_address addr on addr.id = o.shipping_address_id
  where ${IS_SALE}
    and o.currency_code = ?
    and (
      (o.created_at >= b.cur_start and o.created_at < b.cur_end)
      or (o.created_at >= b.prev_start and o.created_at < b.prev_end)
    )
),
items as (
  select
    s.is_current,
    coalesce(li.product_id, li.product_title) as product_key,
    li.product_id,
    li.product_title,
    li.product_handle,
    li.thumbnail,
    oi.quantity,
    coalesce(oi.unit_price, li.unit_price) * oi.quantity as amount
  from sales s
  join order_item oi
    on oi.order_id = s.id and oi.version = s.version and oi.deleted_at is null
  join order_line_item li on li.id = oi.item_id and li.deleted_at is null
)
select
  (
    select json_build_object(
      'orders', count(*) filter (where is_current),
      'sales', coalesce(sum(total) filter (where is_current), 0),
      'collected', coalesce(sum(collected) filter (where is_current), 0),
      'outstanding', coalesce(sum(greatest(total - collected, 0)) filter (where is_current), 0),
      'previous_orders', count(*) filter (where not is_current),
      'previous_sales', coalesce(sum(total) filter (where not is_current), 0),
      'previous_collected', coalesce(sum(collected) filter (where not is_current), 0)
    )
    from sales
  ) as totals,
  (
    select json_build_object(
      'units', coalesce(sum(quantity) filter (where is_current), 0),
      'previous_units', coalesce(sum(quantity) filter (where not is_current), 0)
    )
    from items
  ) as units,
  (
    select coalesce(json_agg(row_to_json(x)), '[]'::json)
    from (
      select is_current, to_char(created_at at time zone ?, ?) as bucket,
             count(*) as orders, sum(total) as sales
      from sales
      group by 1, 2
    ) x
  ) as series,
  (
    select coalesce(json_agg(row_to_json(x)), '[]'::json)
    from (
      select max(product_id) as product_id, max(product_title) as title,
             max(product_handle) as handle, max(thumbnail) as thumbnail,
             sum(quantity) as units, sum(amount) as sales
      from items
      where is_current
      group by product_key
      order by units desc, sales desc
      limit 10
    ) x
  ) as products,
  (
    select coalesce(json_agg(row_to_json(x)), '[]'::json)
    from (
      select provider_id, count(*) as orders, sum(total) as sales,
             sum(collected) as collected
      from sales
      where is_current
      group by provider_id
      order by sales desc
    ) x
  ) as methods,
  (
    select coalesce(json_agg(row_to_json(x)), '[]'::json)
    from (
      select min(province) as province, count(*) as orders, sum(total) as sales
      from sales
      where is_current and province is not null
      group by lower(province)
      order by sales desc
      limit 10
    ) x
  ) as provinces,
  (
    select json_build_object(
      'identified', count(*),
      'returning', count(*) filter (where f.first_at < (select cur_start from bounds))
    )
    from (
      select c.phone, min(o.created_at) as first_at
      from (select distinct phone from sales where is_current and phone is not null) c
      join order_address a on ${phoneKey("a.phone")} = c.phone
      join "order" o on o.shipping_address_id = a.id
      where ${IS_SALE}
      group by c.phone
    ) f
  ) as customers,
  (
    select count(*)
    from "order" o, bounds b
    where o.deleted_at is null
      and o.is_draft_order = false
      and o.status = 'canceled'
      and o.currency_code = ?
      and o.created_at >= b.cur_start
      and o.created_at < b.cur_end
  ) as canceled
`

type Row = Record<string, any>

export type SalesTotals = {
  orders: number
  sales: number
  collected: number
  outstanding: number
  units: number
  average_order: number
}

export type SalesReport = {
  currency: string
  totals: SalesTotals
  previous: Omit<SalesTotals, "outstanding">
  series: {
    current: { buckets: string[]; sales: (number | null)[]; orders: (number | null)[] }
    previous: { buckets: string[]; sales: (number | null)[]; orders: (number | null)[] }
  }
  products: {
    product_id: string | null
    title: string
    handle: string | null
    thumbnail: string | null
    units: number
    sales: number
  }[]
  methods: { provider_id: string | null; orders: number; sales: number; collected: number }[]
  provinces: { province: string; orders: number; sales: number }[]
  customers: { identified: number; returning: number; new: number }
  canceled_orders: number
}

const num = (value: unknown): number => Number(value ?? 0) || 0

/** A money figure, rounded to cents so float noise never reaches the UI. */
const money = (value: unknown): number => Math.round(num(value) * 100) / 100

const averageOf = (sales: number, orders: number) =>
  orders > 0 ? money(sales / orders) : 0

/**
 * The period's buckets filled in order, with zeros for buckets without sales
 * and nulls for the part of today that has not happened yet.
 */
const fillSeries = (
  rows: Row[],
  isCurrent: boolean,
  buckets: string[],
  lastBucket: string | null
) => {
  const byBucket = new Map(
    rows.filter((r) => r.is_current === isCurrent).map((r) => [r.bucket, r])
  )
  const future = (bucket: string) => lastBucket !== null && bucket > lastBucket

  return {
    buckets,
    sales: buckets.map((b) => (future(b) ? null : money(byBucket.get(b)?.sales))),
    orders: buckets.map((b) => (future(b) ? null : num(byBucket.get(b)?.orders))),
  }
}

export const salesReport = async (
  pg: Knex,
  {
    current,
    previous,
    granularity,
    currentBuckets,
    previousBuckets,
    lastBucket,
    currency,
  }: {
    current: Period
    previous: Period
    granularity: Granularity
    currentBuckets: string[]
    previousBuckets: string[]
    /** Last bucket that has started, when the period runs up to now. */
    lastBucket: string | null
    currency: string
  }
): Promise<SalesReport> => {
  const result = await pg.raw(REPORT_SQL, [
    new Date(current.start).toISOString(),
    new Date(current.end).toISOString(),
    new Date(previous.start).toISOString(),
    new Date(previous.end).toISOString(),
    currency,
    STORE_TIME_ZONE,
    BUCKET_FORMAT[granularity],
    currency,
  ])

  const row: Row = result.rows[0]
  const totals: Row = row.totals ?? {}
  const units: Row = row.units ?? {}
  const series: Row[] = row.series ?? []
  const customers: Row = row.customers ?? {}

  const sales = money(totals.sales)
  const orders = num(totals.orders)
  const previousSales = money(totals.previous_sales)
  const previousOrders = num(totals.previous_orders)

  return {
    currency,
    totals: {
      orders,
      sales,
      collected: money(totals.collected),
      outstanding: money(totals.outstanding),
      units: num(units.units),
      average_order: averageOf(sales, orders),
    },
    previous: {
      orders: previousOrders,
      sales: previousSales,
      collected: money(totals.previous_collected),
      units: num(units.previous_units),
      average_order: averageOf(previousSales, previousOrders),
    },
    series: {
      current: fillSeries(series, true, currentBuckets, lastBucket),
      previous: fillSeries(series, false, previousBuckets, null),
    },
    products: (row.products ?? []).map((p: Row) => ({
      product_id: p.product_id ?? null,
      title: p.title ?? "Producto",
      handle: p.handle ?? null,
      thumbnail: p.thumbnail ?? null,
      units: num(p.units),
      sales: money(p.sales),
    })),
    methods: (row.methods ?? []).map((m: Row) => ({
      provider_id: m.provider_id ?? null,
      orders: num(m.orders),
      sales: money(m.sales),
      collected: money(m.collected),
    })),
    provinces: (row.provinces ?? []).map((p: Row) => ({
      province: p.province,
      orders: num(p.orders),
      sales: money(p.sales),
    })),
    customers: {
      identified: num(customers.identified),
      returning: num(customers.returning),
      new: num(customers.identified) - num(customers.returning),
    },
    canceled_orders: num(row.canceled),
  }
}

const PENDING_SQL = `
with open_orders as (
  select
    o.id,
    o.version,
    o.metadata,
    ${ORDER_TOTAL} as total,
    ${COLLECTED} as collected
  from "order" o
  ${SUMMARY_JOIN}
  ${PAYMENTS_JOIN}
  where o.deleted_at is null
    and o.is_draft_order = false
    and o.status in ('pending', 'requires_action')
    and o.currency_code = ?
)
select
  count(*) filter (where metadata ->> 'bac_transfer_status' = 'proof_uploaded') as proofs_to_review,
  count(*) filter (where collected < total) as awaiting_payment,
  coalesce(sum(greatest(total - collected, 0)), 0) as awaiting_amount,
  count(*) filter (
    where exists (
      select 1
      from order_item oi
      where oi.order_id = open_orders.id
        and oi.version = open_orders.version
        and oi.deleted_at is null
        and oi.fulfilled_quantity < oi.quantity
    )
  ) as to_fulfill
from open_orders
`

export type PendingWork = {
  proofs_to_review: number
  awaiting_payment: number
  awaiting_amount: number
  to_fulfill: number
}

/**
 * What needs the owner's attention right now, whatever range is selected:
 * receipts to check, orders not paid yet, orders not shipped yet. Only open
 * orders — completed, archived and canceled ones are done with.
 */
export const pendingWork = async (
  pg: Knex,
  currency: string
): Promise<PendingWork> => {
  const result = await pg.raw(PENDING_SQL, [currency])
  const row: Row = result.rows[0] ?? {}

  return {
    proofs_to_review: num(row.proofs_to_review),
    awaiting_payment: num(row.awaiting_payment),
    awaiting_amount: money(row.awaiting_amount),
    to_fulfill: num(row.to_fulfill),
  }
}

const CURRENCY_SQL = `
select currency_code
from (
  select o.currency_code, count(*) as orders, 0 as fallback
  from "order" o
  where ${IS_SALE}
    and o.created_at > now() - interval '365 days'
  group by o.currency_code
  union all
  select sc.currency_code, 0 as orders, case when sc.is_default then 1 else 2 end as fallback
  from store_currency sc
  where sc.deleted_at is null
) c
order by orders desc, fallback asc
limit 1
`

const CURRENCY_TTL_MS = 10 * 60 * 1000

let currencyCache: { value: string; expiresAt: number } | null = null

/**
 * The currency the dashboard reports in: the one most of the last year's
 * orders were placed in, or the store's default before there are any. Totals
 * never mix currencies; an order in another one is simply not counted.
 */
export const reportingCurrency = async (pg: Knex): Promise<string> => {
  if (currencyCache && currencyCache.expiresAt > Date.now()) {
    return currencyCache.value
  }

  const result = await pg.raw(CURRENCY_SQL)
  const value: string = result.rows[0]?.currency_code ?? "hnl"
  currencyCache = { value, expiresAt: Date.now() + CURRENCY_TTL_MS }
  return value
}
