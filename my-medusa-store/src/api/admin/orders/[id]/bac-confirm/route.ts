import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const orderService = req.scope.resolve(Modules.ORDER)
  const paymentService = req.scope.resolve(Modules.PAYMENT)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "metadata",
      "currency_code",
      "total",
      "payment_collections.id",
      "payment_collections.payments.id",
      "payment_collections.payments.amount",
      "payment_collections.payments.provider_id",
    ],
    filters: { id: orderId },
  })

  const order = orders?.[0]
  if (!order) {
    return res.status(404).json({ message: "Pedido no encontrado." })
  }

  const payment = order.payment_collections
    ?.flatMap((pc: any) => pc.payments ?? [])
    ?.find((p: any) => p?.provider_id?.startsWith("pp_transferencia-bac"))

  if (!payment) {
    return res
      .status(400)
      .json({ message: "Este pedido no usa transferencia BAC." })
  }

  try {
    await paymentService.capturePayment({
      payment_id: payment.id,
      amount: payment.amount,
    })
  } catch (err) {
    logger.error(`Failed to capture BAC payment ${payment.id}: ${err}`)
    return res
      .status(500)
      .json({ message: "No pudimos capturar el pago. Revisa los logs." })
  }

  const now = new Date().toISOString()
  await orderService.updateOrders([
    {
      id: orderId,
      metadata: {
        ...(order.metadata ?? {}),
        bac_transfer_status: "verified",
        bac_transfer_verified_at: now,
      },
    } as any,
  ])

  try {
    await eventBus.emit({
      name: "bac_transfer.payment_verified",
      data: { order_id: orderId },
    })
  } catch (err) {
    logger.error(`Failed to emit bac_transfer.payment_verified: ${err}`)
  }

  return res.status(200).json({ ok: true, verified_at: now })
}
