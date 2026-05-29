import { bacProofReceivedCustomer } from "./bac-proof-received-customer"
import { bacProofReceivedOwner } from "./bac-proof-received-owner"
import { bacPaymentVerifiedCustomer } from "./bac-payment-verified-customer"
import { orderShippedCustomer } from "./order-shipped-customer"
import { orderDeliveredCustomer } from "./order-delivered-customer"
import { orderCanceledCustomer } from "./order-canceled-customer"

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

type Renderer = (data: any) => RenderedEmail | Promise<RenderedEmail>

const registry: Record<string, Renderer> = {
  "bac-proof-received-customer": bacProofReceivedCustomer,
  "bac-proof-received-owner": bacProofReceivedOwner,
  "bac-payment-verified-customer": bacPaymentVerifiedCustomer,
  "order-shipped-customer": orderShippedCustomer,
  "order-delivered-customer": orderDeliveredCustomer,
  "order-canceled-customer": orderCanceledCustomer,
}

export async function renderTemplate(
  name: string,
  data: any
): Promise<RenderedEmail> {
  const renderer = registry[name]
  if (!renderer) {
    throw new Error(`Unknown email template: ${name}`)
  }
  return renderer(data)
}
