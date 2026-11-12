import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"

import type { Dict } from "../../i18n/dictionary"
import { useT } from "../../i18n/use-t"
import { LiveVisitor, useLive } from "../../lib/analytics"
import {
  activityLabel,
  countryName,
  deviceLabel,
  flagOf,
  formatDuration,
  formatNumber,
  pageLabel,
  sourceLabel,
} from "../../lib/analytics-format"
import { ProductThumb } from "./bar-list"
import { ErrorNote, Loading } from "./section"

const COLLAPSED_ROWS = 8

const LiveDot = () => (
  <span className="relative flex h-2.5 w-2.5" aria-hidden>
    <span
      className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping"
      style={{ backgroundColor: "var(--an-live)" }}
    />
    <span
      className="relative inline-flex h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: "var(--an-live)" }}
    />
  </span>
)

const MiniStat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col gap-y-1">
    <span className="y2k-num text-ui-fg-base text-xl font-medium leading-7">
      {formatNumber(value)}
    </span>
    <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
  </div>
)

const placeOf = (visitor: LiveVisitor, t: Dict) => {
  if (!visitor.country) {
    return t.analytics.live.unknownPlace
  }
  const flag = flagOf(visitor.country)
  return `${flag} ${visitor.city ?? countryName(visitor.country)}`.trim()
}

const VisitorRow = ({ visitor, now }: { visitor: LiveVisitor; now: number }) => {
  const t = useT()
  const words = t.analytics.live

  return (
  <li className="flex items-center gap-x-3 px-6 py-3">
    <ProductThumb
      src={visitor.product?.thumbnail ?? null}
      alt={visitor.product?.title ?? ""}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
      <Text size="small" leading="compact" weight="plus" className="truncate">
        {pageLabel(visitor.path, visitor.product)}
      </Text>
      <Text size="xsmall" leading="compact" className="text-ui-fg-subtle truncate">
        {[
          activityLabel(visitor.page_type),
          placeOf(visitor, t),
          deviceLabel(visitor.device),
          words.cameFrom(sourceLabel(visitor.source)),
        ].join(" · ")}
      </Text>
    </div>
    <div className="hidden flex-wrap justify-end gap-1 md:flex">
      {visitor.contacted_whatsapp && (
        <Badge size="2xsmall" color="green">
          WhatsApp
        </Badge>
      )}
      {(visitor.added_to_cart || visitor.has_cart) && (
        <Badge size="2xsmall" color="blue">
          {words.badgeCart}
        </Badge>
      )}
      {visitor.reached_checkout && (
        <Badge size="2xsmall" color="orange">
          {words.badgeCheckout}
        </Badge>
      )}
      {visitor.purchased && (
        <Badge size="2xsmall" color="purple">
          {words.badgeBought}
        </Badge>
      )}
      {visitor.logged_in && (
        <Badge size="2xsmall" color="grey">
          {words.badgeAccount}
        </Badge>
      )}
    </div>
    <div className="flex shrink-0 flex-col items-end gap-y-0.5">
      <Text size="xsmall" leading="compact" className="tabular-nums">
        {formatDuration(now - visitor.started_at)}
      </Text>
      <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
        {words.pages(visitor.pages)}
      </Text>
    </div>
  </li>
  )
}

/**
 * Who is on the storefront right now, polled every 5 s. The big number is
 * the one this dashboard leads with; everything else is context for it.
 */
export const LivePanel = () => {
  const t = useT()
  const words = t.analytics.live
  const { data, error, isLoading } = useLive()
  const [expanded, setExpanded] = useState(false)

  const visitors = data?.visitors ?? []
  const count = (test: (visitor: LiveVisitor) => boolean) =>
    visitors.filter(test).length
  const shown = expanded ? visitors : visitors.slice(0, COLLAPSED_ROWS)

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Heading level="h2">{words.title}</Heading>
          <LiveDot />
          {data?.backend === "memory" && (
            <Badge size="2xsmall" color="orange">
              {words.noRedis}
            </Badge>
          )}
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {words.refreshes}
        </Text>
      </div>

      {isLoading ? (
        <Loading />
      ) : !data ? (
        <div className="px-6 py-4">
          <ErrorNote error={error} />
        </div>
      ) : (
        <>
          <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-center">
            <div className="flex flex-col gap-y-2">
              <span className="y2k-num text-ui-fg-base text-[56px] font-medium leading-none">
                {formatNumber(data.active)}
              </span>
              <Text size="small" leading="compact" weight="plus">
                {words.inStoreNow(data.active)}
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {words.recent(formatNumber(data.recent), data.recent_window_minutes)}
              </Text>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat
                label={words.viewingProducts}
                value={count((v) => v.page_type === "product")}
              />
              <MiniStat
                label={words.withCart}
                value={count((v) => v.has_cart || v.added_to_cart)}
              />
              <MiniStat
                label={words.inCheckout}
                value={count((v) => v.page_type === "checkout")}
              />
              <MiniStat
                label={words.openedWhatsapp}
                value={count((v) => v.contacted_whatsapp)}
              />
            </div>
          </div>

          <div className="bg-ui-bg-subtle px-6 py-3">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {[
                words.today,
                words.visits(data.today.sessions, formatNumber(data.today.sessions)),
                words.pageviews(data.today.pageviews, formatNumber(data.today.pageviews)),
                words.openedWhatsappCount(formatNumber(data.today.contacted_whatsapp)),
              ].join(" · ")}
            </Text>
          </div>

          {error && (
            <div className="px-6 py-3">
              <ErrorNote error={error} />
            </div>
          )}

          {visitors.length === 0 ? (
            <div className="px-6 py-4">
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {words.nobody}
              </Text>
            </div>
          ) : (
            <div>
              <ul className="divide-y">
                {shown.map((visitor) => (
                  <VisitorRow
                    key={visitor.id}
                    visitor={visitor}
                    now={data.generated_at}
                  />
                ))}
              </ul>
              {visitors.length > COLLAPSED_ROWS && (
                <div className="border-t px-6 py-3">
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => setExpanded((e) => !e)}
                  >
                    {expanded ? words.showLess : words.showAll(visitors.length)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Container>
  )
}
