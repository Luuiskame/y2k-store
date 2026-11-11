import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ContraEntregaProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [ContraEntregaProviderService],
})
