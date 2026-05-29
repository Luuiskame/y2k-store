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

type TransferenciaBacData = {
  status: "pending" | "proof_uploaded" | "verified" | "rejected"
  proof_files?: { url: string; uploaded_at: string }[]
  verified_at?: string
}

class TransferenciaBacProviderService extends AbstractPaymentProvider {
  static identifier = "transferencia-bac"

  // AbstractPaymentProvider's constructor is protected; redeclare it as public
  // so the class can be registered in the ModuleProvider's `services` array.
  constructor(
    cradle: Record<string, unknown>,
    options?: Record<string, unknown>
  ) {
    super(cradle, options)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const data: TransferenciaBacData = { status: "pending" }
    return {
      id: `bac_${Date.now()}`,
      data,
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
    const existing = (input.data ?? {}) as TransferenciaBacData
    const data: TransferenciaBacData = {
      ...existing,
      status: "verified",
      verified_at: new Date().toISOString(),
    }
    return { data: data as unknown as Record<string, unknown> }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const existing = (input.data ?? {}) as TransferenciaBacData
    return {
      data: {
        ...existing,
        status: "rejected",
      } as unknown as Record<string, unknown>,
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    // Refunds for bank transfers are processed manually outside Medusa.
    // We persist the intent so admins see the record.
    return {
      data: (input.data ?? {}) as Record<string, unknown>,
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return {
      data: (input.data ?? {}) as Record<string, unknown>,
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    return {
      data: (input.data ?? {}) as Record<string, unknown>,
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return {
      data: (input.data ?? {}) as Record<string, unknown>,
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? { status: "pending" }) as TransferenciaBacData
    switch (data.status) {
      case "verified":
        return { status: PaymentSessionStatus.CAPTURED, data: data as unknown as Record<string, unknown> }
      case "rejected":
        return { status: PaymentSessionStatus.CANCELED, data: data as unknown as Record<string, unknown> }
      default:
        return { status: PaymentSessionStatus.AUTHORIZED, data: data as unknown as Record<string, unknown> }
    }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" }
  }
}

export default TransferenciaBacProviderService
