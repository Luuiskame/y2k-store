import { ChevronDownMini, Phone, TruckFast } from "@medusajs/icons"
import type { AdminOrder } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  DropdownMenu,
  Input,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"

import { useT } from "../../i18n/use-t"
import { formatMoney } from "../../lib/analytics-format"
import { cheer } from "../../lib/cheer"
import { sdk } from "../../lib/client"
import { COMPACT_ORDERS_KEY, errorMessage } from "../../lib/compact"
import { STORE_NAME } from "../../lib/orders-format"
import {
  MESSAGE_TEMPLATES,
  MessageOrder,
  toWhatsappNumber,
  whatsappUrl,
} from "../../lib/whatsapp"
import { WhatsappIcon } from "../common/whatsapp"

type ContraEntrega = {
  surcharge_rate?: number
  surcharge?: number
  collect_total?: number
}

type Payment = {
  id: string
  provider_id?: string
  amount?: number
  captured_at?: string | null
  canceled_at?: string | null
}

const standingPayment = (order: AdminOrder): Payment | undefined => {
  const payments = (order.payment_collections ?? []).flatMap(
    (collection) => (collection.payments ?? []) as unknown as Payment[]
  )
  return payments.find((payment) => !payment.canceled_at) ?? payments[0]
}

const TO_SHIP = ["not_fulfilled", "partially_fulfilled"]

/**
 * Top of an order: who it is for and how to reach them, before Medusa's own
 * sections. On a phone the customer's details are otherwise four screens
 * down, and reaching the customer is what the owner opens an order for.
 *
 * - WhatsApp opens the chat with a greeting; the arrow next to it offers the
 *   other ready-made messages (confirm, on its way, coordinate, receipt).
 * - A contra entrega order says how much cash to collect and is marked as
 *   collected from here (that captures its payment).
 * - A BAC transfer registered from the admin is confirmed from here too:
 *   its receipt arrives over WhatsApp, so the receipt card never offers to.
 */
export const OrderContact = ({ order }: { order: AdminOrder }) => {
  const t = useT()
  const words = t.orders.contact
  const queryClient = useQueryClient()
  const prompt = usePrompt()

  const address = order.shipping_address
  const typedPhone =
    address?.phone || order.billing_address?.phone || order.customer?.phone || ""
  const countryCode = address?.country_code ?? null

  // What the owner typed to correct a number the store could not read.
  const [correction, setCorrection] = useState<string | null>(null)
  const number = toWhatsappNumber(correction ?? typedPhone, countryCode)
  const editing = correction !== null

  const currency = order.currency_code
  const money = (amount: number) => formatMoney(amount, currency)

  const payment = standingPayment(order)
  const isContraEntrega = !!payment?.provider_id?.startsWith("pp_contra-entrega")
  // A transfer registered from the admin: the receipt comes over WhatsApp,
  // not through the storefront's upload, so it is confirmed from here.
  const isManualTransfer =
    !!payment?.provider_id?.startsWith("pp_transferencia-bac") &&
    !!order.metadata?.manual_order
  const cod = (order.metadata?.contra_entrega ?? null) as ContraEntrega | null
  const collectTotal =
    isContraEntrega && typeof cod?.collect_total === "number"
      ? cod.collect_total
      : null
  const collected = !!payment?.captured_at
  const canceled = order.status === "canceled"
  const note = (order.metadata?.manual_order as { note?: string } | undefined)?.note
  const toShip = TO_SHIP.includes(
    (order as unknown as { fulfillment_status?: string }).fulfillment_status ?? ""
  )

  const fullName = [address?.first_name, address?.last_name].filter(Boolean).join(" ")
  const place = [address?.city, address?.province].filter(Boolean).join(", ")
  const references = [address?.address_2, address?.company].filter(Boolean).join(" / ")

  const messageOrder: MessageOrder = {
    display_id: order.display_id ?? null,
    first_name: address?.first_name ?? "",
    total: money(order.total),
    collect_total: collectTotal !== null ? money(collectTotal) : null,
    items: (order.items ?? []).map((item) => ({
      title: item.product_title ?? item.title,
      variant_title: item.variant_title ?? null,
      quantity: item.quantity,
    })),
    address: [address?.address_1, place].filter(Boolean).join(", "),
  }

  const capture = useMutation({
    mutationFn: () => sdk.admin.payment.capture(payment!.id, {}),
    onSuccess: () => {
      toast.success(cheer(words.collectedToast, "paid"))
      // Medusa's order pages, our phone list and Estadísticas all show it.
      for (const queryKey of [["orders"], COMPACT_ORDERS_KEY, ["y2k-analytics"]]) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, words.collectFailed))
    },
  })

  const confirmTransfer = useMutation({
    // The same route the receipt card uses: it captures the payment, marks
    // the transfer as verified and emails the customer if there is an email.
    mutationFn: () =>
      sdk.client.fetch(`/admin/orders/${order.id}/bac-confirm`, { method: "POST" }),
    onSuccess: () => {
      toast.success(cheer(words.transferToast, "paid"))
      for (const queryKey of [["orders"], COMPACT_ORDERS_KEY, ["y2k-analytics"]]) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, words.transferFailed))
    },
  })

  const onConfirmTransfer = async () => {
    const confirmed = await prompt({
      title: words.transferPrompt.title,
      description: words.transferPrompt.description(
        money(payment?.amount ?? order.total),
        !!order.email
      ),
      confirmText: words.transferPrompt.confirm,
      cancelText: words.transferPrompt.cancel,
      variant: "confirmation",
    })
    if (confirmed) {
      confirmTransfer.mutate()
    }
  }

  const onCollect = async () => {
    const amount = money(collectTotal ?? payment?.amount ?? order.total)
    const confirmed = await prompt({
      title: words.collectPrompt.title,
      description: words.collectPrompt.description(amount),
      confirmText: words.collectPrompt.confirm,
      cancelText: words.collectPrompt.cancel,
      variant: "confirmation",
    })
    if (confirmed) {
      capture.mutate()
    }
  }

  if (!address && !typedPhone && !isContraEntrega) {
    return null
  }

  return (
    <Container className="divide-y p-0" data-y2k-order-contact>
      <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <Text size="base" leading="compact" weight="plus" className="truncate">
            {fullName || order.email || words.noName}
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {[number?.display ?? typedPhone, place].filter(Boolean).join(" · ") ||
              words.nothingToReach}
          </Text>
          {address?.address_1 && (
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {address.address_1}
              {references ? words.reference(references) : ""}
            </Text>
          )}
          {number && !number.certain && !editing && (
            <Text size="xsmall" leading="compact" className="text-ui-tag-orange-text">
              {t.orders.whatsapp.guessed(number.display)}{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setCorrection(typedPhone)}
              >
                {t.orders.whatsapp.fix}
              </button>
            </Text>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {number ? (
            <div className="flex items-stretch">
              <a
                href={whatsappUrl(
                  number.digits,
                  MESSAGE_TEMPLATES[0].build(messageOrder, STORE_NAME)
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="y2k-whatsapp rounded-r-none"
                aria-label={t.orders.whatsapp.to("WhatsApp", number.display)}
              >
                <WhatsappIcon />
                WhatsApp
              </a>
              <DropdownMenu>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="y2k-whatsapp rounded-l-none border-l border-white/25 px-2"
                    aria-label={t.orders.whatsapp.others}
                  >
                    <ChevronDownMini />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" className="w-[280px]">
                  <DropdownMenu.Label>{t.orders.whatsapp.ready}</DropdownMenu.Label>
                  {MESSAGE_TEMPLATES.map((template) => (
                    <DropdownMenu.Item key={template.id} asChild>
                      <a
                        href={whatsappUrl(
                          number.digits,
                          template.build(messageOrder, STORE_NAME)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span>{t.orders.whatsapp.templates[template.id].label}</span>
                        <span className="text-ui-fg-subtle txt-compact-xsmall">
                          {t.orders.whatsapp.templates[template.id].hint}
                        </span>
                      </a>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu>
            </div>
          ) : (
            !editing && (
              <Button
                size="small"
                variant="secondary"
                onClick={() => setCorrection(typedPhone)}
              >
                <WhatsappIcon size={16} />
                {t.orders.whatsapp.typeNumber}
              </Button>
            )
          )}
          {typedPhone && (
            <Button size="small" variant="secondary" asChild>
              <a
                href={`tel:${number ? `+${number.digits}` : typedPhone}`}
                aria-label={words.call}
              >
                <Phone />
                {words.call}
              </a>
            </Button>
          )}
          {toShip && !canceled && (
            <Button size="small" variant="secondary" asChild>
              <Link to="fulfillment">
                <TruckFast />
                {words.ship}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center">
          <div className="flex flex-1 flex-col gap-1">
            <Text size="small" leading="compact" weight="plus">
              {t.orders.whatsapp.numberLabel}
            </Text>
            <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
              {t.orders.whatsapp.numberHelp}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Input
              size="small"
              type="tel"
              inputMode="tel"
              autoFocus
              value={correction ?? ""}
              onChange={(event) => setCorrection(event.target.value)}
              aria-label={t.orders.whatsapp.numberLabel}
              className="w-[200px]"
            />
            <Button size="small" variant="transparent" onClick={() => setCorrection(null)}>
              {words.cancel}
            </Button>
          </div>
        </div>
      )}

      {isContraEntrega && (
        <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Text size="small" leading="compact" weight="plus">
                {words.cashOnDelivery}
              </Text>
              {collected ? (
                <Badge size="2xsmall" color="green">
                  {words.collected}
                </Badge>
              ) : canceled ? (
                <Badge size="2xsmall" color="grey">
                  {words.orderCanceled}
                </Badge>
              ) : (
                <Badge size="2xsmall" color="orange">
                  {words.toCollect}
                </Badge>
              )}
            </div>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {collectTotal !== null ? (
                <>
                  {words.collectOnDelivery}{" "}
                  <span className="text-ui-fg-base font-medium">
                    {money(collectTotal)}
                  </span>
                  {cod?.surcharge
                    ? words.withSurcharge(money(order.total), money(cod.surcharge))
                    : words.noSurcharge}
                </>
              ) : (
                <>
                  {words.collectOnDelivery} {money(order.total)}
                </>
              )}
            </Text>
          </div>
          {!collected && !canceled && payment && (
            <Button
              size="small"
              className="shrink-0 self-start md:self-auto"
              onClick={onCollect}
              isLoading={capture.isPending}
              disabled={capture.isPending}
            >
              {words.markCollected}
            </Button>
          )}
        </div>
      )}

      {isManualTransfer && (
        <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Text size="small" leading="compact" weight="plus">
                {words.transfer}
              </Text>
              {collected ? (
                <Badge size="2xsmall" color="green">
                  {words.paid}
                </Badge>
              ) : canceled ? (
                <Badge size="2xsmall" color="grey">
                  {words.orderCanceled}
                </Badge>
              ) : (
                <Badge size="2xsmall" color="orange">
                  {words.awaitingPayment}
                </Badge>
              )}
            </div>
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {collected
                ? words.received(money(payment?.amount ?? order.total))
                : words.whenItArrives(money(payment?.amount ?? order.total))}
            </Text>
          </div>
          {!collected && !canceled && (
            <Button
              size="small"
              className="shrink-0 self-start md:self-auto"
              onClick={onConfirmTransfer}
              isLoading={confirmTransfer.isPending}
              disabled={confirmTransfer.isPending}
            >
              {words.confirmPayment}
            </Button>
          )}
        </div>
      )}

      {note && (
        <div className="px-6 py-3">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            <span className="text-ui-fg-base font-medium">{words.note}</span> {note}
          </Text>
        </div>
      )}
    </Container>
  )
}
