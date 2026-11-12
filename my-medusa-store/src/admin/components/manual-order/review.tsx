import {
  Button,
  FocusModal,
  Heading,
  Label,
  RadioGroup,
  Switch,
  Text,
  Textarea,
  clx,
  toast,
} from "@medusajs/ui"
import { ReactNode, useState } from "react"

import { useT } from "../../i18n/use-t"
import { formatMoney } from "../../lib/analytics-format"
import { errorMessage } from "../../lib/compact"
import {
  PaymentMethod,
  PlacedOrder,
  WorkingCart,
  useCompleteWorkingCart,
  useSetShippingMethod,
} from "../../lib/manual-orders"
import { toWhatsappNumber } from "../../lib/whatsapp"
import { Thumb } from "../common/thumb"

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <Heading level="h3">{title}</Heading>
    {children}
  </section>
)

const Row = ({
  label,
  value,
  strong = false,
}: {
  label: ReactNode
  value: string
  strong?: boolean
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <Text
      size="small"
      leading="compact"
      weight={strong ? "plus" : "regular"}
      className={strong ? undefined : "text-ui-fg-subtle"}
    >
      {label}
    </Text>
    <Text
      size="small"
      leading="compact"
      weight={strong ? "plus" : "regular"}
      className="tabular-nums"
    >
      {value}
    </Text>
  </div>
)

/**
 * The last step of "Nuevo pedido": the working cart the server built, with
 * its real totals, and the three choices left (how it ships, how it is
 * paid, a note). Nothing exists as an order until "Crear pedido".
 */
export const ReviewModal = ({
  cart,
  onClose,
  onCartChange,
  onPlaced,
}: {
  /** The working cart under review; null keeps the modal closed. */
  cart: WorkingCart | null
  onClose: () => void
  onCartChange: (cart: WorkingCart) => void
  onPlaced: (order: PlacedOrder) => void
}) => {
  const words = useT().manualOrder.reviewModal
  const [method, setMethod] = useState<PaymentMethod>("contra_entrega")
  const [surcharge, setSurcharge] = useState(true)
  const [note, setNote] = useState("")

  const shipping = useSetShippingMethod()
  const complete = useCompleteWorkingCart()
  const busy = shipping.isPending || complete.isPending

  if (!cart) {
    return null
  }

  const money = (amount: number) => formatMoney(amount, cart.currency_code)
  const address = cart.shipping_address
  const number = toWhatsappNumber(address?.phone, address?.country_code)
  const isCod = method === "contra_entrega"
  const collect = isCod && surcharge ? cart.contra_entrega.collect_total : cart.total

  const onShipping = (optionId: string) => {
    if (optionId === cart.shipping_method?.id) {
      return
    }
    shipping.mutate(
      { cartId: cart.id, optionId },
      {
        onSuccess: onCartChange,
        onError: (error) =>
          toast.error(errorMessage(error, words.shippingFailed)),
      }
    )
  }

  const onCreate = () => {
    complete.mutate(
      {
        cartId: cart.id,
        payment_method: method,
        apply_surcharge: isCod && surcharge,
        note: note.trim() || null,
      },
      {
        onSuccess: onPlaced,
        onError: (error) =>
          toast.error(errorMessage(error, words.createFailed)),
      }
    )
  }

  return (
    <FocusModal
      open
      onOpenChange={(open) => {
        if (!open && !complete.isPending) {
          onClose()
        }
      }}
    >
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title asChild>
            <Heading level="h2">{words.title}</Heading>
          </FocusModal.Title>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-col overflow-y-auto">
          <FocusModal.Description className="sr-only">
            {words.description}
          </FocusModal.Description>
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-y-8 px-5 py-6">
            <Block title={words.products}>
              <ul className="flex flex-col gap-3">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <Thumb src={item.thumbnail} alt="" size="sm" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Text size="small" leading="compact" weight="plus" className="truncate">
                        {item.title}
                      </Text>
                      <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                        {[item.variant_title, `${item.quantity} × ${money(item.unit_price)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </div>
                    <Text size="small" leading="compact" className="shrink-0 tabular-nums">
                      {money(item.total)}
                    </Text>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title={words.delivery}>
              <div className="flex flex-col gap-0.5">
                <Text size="small" leading="compact" weight="plus">
                  {address?.full_name}
                </Text>
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  {[number?.display ?? address?.phone, cart.email].filter(Boolean).join(" · ")}
                </Text>
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  {[address?.address_1, address?.city, address?.province]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
                {(address?.address_2 || address?.company) && (
                  <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    {words.reference}{" "}
                    {[address?.address_2, address?.company].filter(Boolean).join(" / ")}
                  </Text>
                )}
              </div>
            </Block>

            <Block title={words.shipping}>
              {cart.shipping_options.length === 0 ? (
                <Text size="small" leading="compact" className="text-ui-fg-error">
                  {words.noShipping}
                </Text>
              ) : (
                <RadioGroup
                  value={cart.shipping_method?.id ?? ""}
                  onValueChange={onShipping}
                  disabled={busy}
                  className={clx("flex flex-col gap-2", shipping.isPending && "opacity-60")}
                  aria-label={words.shippingAria}
                >
                  {cart.shipping_options.map((option) => (
                    <RadioGroup.ChoiceBox
                      key={option.id}
                      value={option.id}
                      label={option.name}
                      description={option.amount > 0 ? money(option.amount) : words.free}
                    />
                  ))}
                </RadioGroup>
              )}
              {!cart.shipping_method && cart.shipping_options.length > 0 && (
                <Text size="small" leading="compact" className="text-ui-tag-orange-text">
                  {words.chooseShipping}
                </Text>
              )}
            </Block>

            <Block title={words.payment}>
              <RadioGroup
                value={method}
                onValueChange={(value) => setMethod(value as PaymentMethod)}
                disabled={busy}
                className="flex flex-col gap-2"
                aria-label={words.paymentAria}
              >
                <RadioGroup.ChoiceBox
                  value="contra_entrega"
                  label={words.cashOnDelivery}
                  description={words.cashOnDeliveryHint}
                />
                <RadioGroup.ChoiceBox
                  value="transferencia_bac"
                  label={words.transfer}
                  description={words.transferHint}
                />
              </RadioGroup>
              {isCod && (
                <div className="flex items-start justify-between gap-4 pt-1">
                  <div className="flex flex-col gap-0.5">
                    <Label htmlFor="mo-surcharge" size="small" weight="plus">
                      {words.surcharge}
                    </Label>
                    <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                      {words.surchargeHint}
                    </Text>
                  </div>
                  <Switch
                    id="mo-surcharge"
                    checked={surcharge}
                    onCheckedChange={setSurcharge}
                    disabled={busy}
                  />
                </div>
              )}
            </Block>

            <Block title={words.note}>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder={words.notePlaceholder}
                aria-label={words.noteAria}
                disabled={busy}
              />
            </Block>

            <div className="bg-ui-bg-subtle shadow-borders-base flex flex-col gap-2 rounded-xl p-4">
              <Row label={words.products} value={money(cart.item_total)} />
              <Row
                label={
                  cart.shipping_method
                    ? words.shippingWith(cart.shipping_method.name)
                    : words.shipping
                }
                value={cart.shipping_method ? money(cart.shipping_total) : "—"}
              />
              {cart.discount_total > 0 && (
                <Row
                  label={words.discount(cart.promo_codes.join(", "))}
                  value={`− ${money(cart.discount_total)}`}
                />
              )}
              {cart.tax_total > 0 && <Row label={words.taxes} value={money(cart.tax_total)} />}
              <div className="border-ui-border-base my-1 border-t" />
              <Row label={words.orderTotal} value={money(cart.total)} strong />
              {isCod && surcharge && (
                <Row
                  label={words.surchargeLine}
                  value={`+ ${money(cart.contra_entrega.surcharge)}`}
                />
              )}
              {isCod && (
                <div className="flex items-baseline justify-between gap-4 pt-1">
                  <Text size="base" leading="compact" weight="plus">
                    {words.collectOnDelivery}
                  </Text>
                  <span className="y2k-num text-ui-fg-base text-[22px] font-medium leading-7">
                    {money(collect)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </FocusModal.Body>

        <FocusModal.Footer>
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={complete.isPending}>
              {words.back}
            </Button>
            <Button
              onClick={onCreate}
              isLoading={complete.isPending}
              disabled={busy || !cart.shipping_method}
            >
              {words.create}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
