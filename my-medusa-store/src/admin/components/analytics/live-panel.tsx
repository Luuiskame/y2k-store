import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { useState } from "react"

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
    <span className="text-ui-fg-base text-xl font-medium leading-7">
      {formatNumber(value)}
    </span>
    <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
  </div>
)

const placeOf = (visitor: LiveVisitor) => {
  if (!visitor.country) {
    return "Ubicación desconocida"
  }
  const flag = flagOf(visitor.country)
  return `${flag} ${visitor.city ?? countryName(visitor.country)}`.trim()
}

const VisitorRow = ({ visitor, now }: { visitor: LiveVisitor; now: number }) => (
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
          placeOf(visitor),
          deviceLabel(visitor.device),
          `llegó por ${sourceLabel(visitor.source)}`,
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
          Carrito
        </Badge>
      )}
      {visitor.reached_checkout && (
        <Badge size="2xsmall" color="orange">
          Checkout
        </Badge>
      )}
      {visitor.purchased && (
        <Badge size="2xsmall" color="purple">
          Compró
        </Badge>
      )}
      {visitor.logged_in && (
        <Badge size="2xsmall" color="grey">
          Con cuenta
        </Badge>
      )}
    </div>
    <div className="flex shrink-0 flex-col items-end gap-y-0.5">
      <Text size="xsmall" leading="compact" className="tabular-nums">
        {formatDuration(now - visitor.started_at)}
      </Text>
      <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
        {visitor.pages} {visitor.pages === 1 ? "página" : "páginas"}
      </Text>
    </div>
  </li>
)

/**
 * Who is on the storefront right now, polled every 5 s. The big number is
 * the one this dashboard leads with; everything else is context for it.
 */
export const LivePanel = () => {
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
          <Heading level="h2">En vivo</Heading>
          <LiveDot />
          {data?.backend === "memory" && (
            <Badge size="2xsmall" color="orange">
              Sin Redis: solo este proceso
            </Badge>
          )}
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          Se actualiza cada 5 segundos
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
              <span className="text-ui-fg-base text-[56px] font-medium leading-none">
                {formatNumber(data.active)}
              </span>
              <Text size="small" leading="compact" weight="plus">
                {data.active === 1
                  ? "persona en la tienda ahora"
                  : "personas en la tienda ahora"}
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {formatNumber(data.recent)} en los últimos{" "}
                {data.recent_window_minutes} minutos
              </Text>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MiniStat
                label="Viendo productos"
                value={count((v) => v.page_type === "product")}
              />
              <MiniStat
                label="Con carrito"
                value={count((v) => v.has_cart || v.added_to_cart)}
              />
              <MiniStat
                label="En el checkout"
                value={count((v) => v.page_type === "checkout")}
              />
              <MiniStat
                label="Abrieron WhatsApp"
                value={count((v) => v.contacted_whatsapp)}
              />
            </div>
          </div>

          <div className="bg-ui-bg-subtle px-6 py-3">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {[
                "Hoy",
                `${formatNumber(data.today.sessions)} ${
                  data.today.sessions === 1 ? "visita" : "visitas"
                }`,
                `${formatNumber(data.today.pageviews)} páginas vistas`,
                `${formatNumber(data.today.contacted_whatsapp)} abrieron WhatsApp`,
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
                Nadie en la tienda en este momento.
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
                    {expanded
                      ? "Ver menos"
                      : `Ver los ${visitors.length} visitantes`}
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
