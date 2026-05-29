import { retrieveOrder } from "@lib/data/orders"
import BacTransferTemplate from "@modules/order/templates/bac-transfer-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Transferencia BAC — Y2K Fit Honduras",
  description:
    "Datos bancarios y subida de comprobante para tu pedido en Y2K Fit Honduras.",
}

export default async function BacTransferPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return <BacTransferTemplate order={order} />
}
