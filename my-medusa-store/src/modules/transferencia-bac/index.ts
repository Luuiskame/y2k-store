import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import TransferenciaBacProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [TransferenciaBacProviderService],
})
