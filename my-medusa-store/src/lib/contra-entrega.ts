/**
 * Pago contra entrega: the customer pays the courier in cash when the order
 * arrives. In the storefront it is not a checkout option, only a WhatsApp
 * handoff, so these orders are registered by the owner from the admin
 * ("Nuevo pedido"). They carry this payment provider, which is how the order
 * page and Estadísticas tell them apart from BAC transfers.
 *
 * The provider is registered in medusa-config.ts but deliberately NOT enabled
 * on the region: enabling it there would list it as a payment method in the
 * storefront checkout.
 */
export const CONTRA_ENTREGA_PROVIDER_ID = "pp_contra-entrega_contra-entrega"

export const BAC_PROVIDER_ID = "pp_transferencia-bac_transferencia-bac"

/**
 * The delivery company keeps 5% of what it collects. Same figure as the
 * storefront's checkout warning and WhatsApp message
 * (my-medusa-store-storefront/src/modules/checkout/util/contra-entrega-message.ts);
 * change both together.
 */
export const CONTRA_ENTREGA_SURCHARGE_RATE = 0.05

/** Rounded to cents, the same way the storefront rounds it. */
export const contraEntregaSurcharge = (
  total: number | null | undefined
): number =>
  Math.round((Number(total) || 0) * CONTRA_ENTREGA_SURCHARGE_RATE * 100) / 100

/**
 * What the courier has to collect. The surcharge is not part of the order's
 * total in Medusa: it is the delivery company's fee, not a sale.
 */
export const contraEntregaCollectTotal = (
  total: number | null | undefined,
  withSurcharge: boolean
): number => {
  const base = Math.round((Number(total) || 0) * 100) / 100
  return withSurcharge
    ? Math.round((base + contraEntregaSurcharge(base)) * 100) / 100
    : base
}

export const isContraEntregaProvider = (
  providerId: string | null | undefined
): boolean => !!providerId && providerId.startsWith("pp_contra-entrega")

/** What `order.metadata.contra_entrega` holds on an order placed this way. */
export type ContraEntregaMetadata = {
  /** 0 when the owner waived the surcharge for this order. */
  surcharge_rate: number
  surcharge: number
  /** Order total plus surcharge: the cash to hand over at the door. */
  collect_total: number
}

export const buildContraEntregaMetadata = (
  total: number | null | undefined,
  withSurcharge: boolean
): ContraEntregaMetadata => ({
  surcharge_rate: withSurcharge ? CONTRA_ENTREGA_SURCHARGE_RATE : 0,
  surcharge: withSurcharge ? contraEntregaSurcharge(total) : 0,
  collect_total: contraEntregaCollectTotal(total, withSurcharge),
})
