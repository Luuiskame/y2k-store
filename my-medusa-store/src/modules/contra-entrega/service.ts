import {
  AbstractPaymentProvider,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

type ContraEntregaData = {
  status: "pending" | "collected" | "canceled"
  collected_at?: string
}

const asRecord = (data: ContraEntregaData) =>
  data as unknown as Record<string, unknown>

/**
 * Cash on delivery. Nothing is charged online: placing the order authorizes
 * the payment (the customer owes it), and the owner captures it from the
 * admin once the courier hands over the cash. Until then the order shows as
 * not collected, in the order page and in Estadísticas.
 */
class ContraEntregaProviderService extends AbstractPaymentProvider {
  static identifier = "contra-entrega"

  // AbstractPaymentProvider's constructor is protected; redeclare it as public
  // so the class can be registered in the ModuleProvider's `services` array.
  constructor(
    cradle: Record<string, unknown>,
    options?: Record<string, unknown>
  ) {
    super(cradle, options)
  }

  async initiatePayment(
    _input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    return {
      id: `cod_${Date.now()}`,
      data: asRecord({ status: "pending" }),
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: (input.data ?? { status: "pending" }) as Record<string, unknown>,
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const existing = (input.data ?? {}) as ContraEntregaData
    return {
      data: asRecord({
        ...existing,
        status: "collected",
        collected_at: new Date().toISOString(),
      }),
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const existing = (input.data ?? {}) as ContraEntregaData
    return { data: asRecord({ ...existing, status: "canceled" }) }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    // Cash goes back by hand; the refund is only recorded here.
    return { data: (input.data ?? {}) as Record<string, unknown> }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: (input.data ?? {}) as Record<string, unknown> }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: (input.data ?? {}) as Record<string, unknown> }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: (input.data ?? {}) as Record<string, unknown> }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? { status: "pending" }) as ContraEntregaData
    switch (data.status) {
      case "collected":
        return { status: PaymentSessionStatus.CAPTURED, data: asRecord(data) }
      case "canceled":
        return { status: PaymentSessionStatus.CANCELED, data: asRecord(data) }
      default:
        return { status: PaymentSessionStatus.AUTHORIZED, data: asRecord(data) }
    }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" }
  }
}

export default ContraEntregaProviderService
