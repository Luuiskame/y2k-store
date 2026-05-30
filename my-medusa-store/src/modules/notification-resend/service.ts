import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
  Logger,
} from "@medusajs/framework/types"
import { Resend } from "resend"
import { renderTemplate } from "./templates"

type Options = {
  apiKey: string
  fromEmail: string
  ownerEmail?: string
}

type InjectedDependencies = {
  logger: Logger
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"
  protected client_: Resend
  protected options_: Options
  protected logger_: Logger

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    if (!options?.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider requires an apiKey option."
      )
    }
    if (!options?.fromEmail) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification provider requires a fromEmail option."
      )
    }
    this.options_ = options
    this.client_ = new Resend(options.apiKey)
    this.logger_ = logger
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { to, template, data } = notification

    const rendered = await renderTemplate(template, data ?? {})

    const { data: result, error } = await this.client_.emails.send({
      from: this.options_.fromEmail,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })

    if (error) {
      this.logger_.error(`Resend send failed: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend send failed: ${error.message}`
      )
    }

    return { id: result?.id }
  }
}

export default ResendNotificationProviderService
