import { defineWidgetConfig } from "@medusajs/admin-sdk"

import "../theme/boot"

/**
 * The store's wordmark above the sign-in form, in its own blackletter and the
 * palette's colors: the first thing the Home Screen app shows after a month
 * away.
 */
const LoginBrandWidget = () => (
  <div className="flex flex-col items-center gap-y-1 pb-2">
    <span className="y2k-wordmark y2k-hero-number text-[44px]">Y2K Fit</span>
    <span className="text-ui-fg-muted txt-compact-xsmall-plus uppercase tracking-[0.28em]">
      Honduras
    </span>
  </div>
)

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBrandWidget
