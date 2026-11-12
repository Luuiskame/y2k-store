import { defineWidgetConfig } from "@medusajs/admin-sdk"

import { Motto } from "../components/larp/motto"
import { STORE_NAME } from "../lib/orders-format"
import "../theme/boot"

/**
 * The store's wordmark above the sign-in form, in its own blackletter and the
 * palette's colors, and under it the owner's motto set big: the first thing
 * the Home Screen app shows after a month away.
 *
 * Nobody is signed in here, so the motto is the one this browser remembers
 * (or the original on a new one); the account's copy arrives after sign-in.
 */
const LoginBrandWidget = () => (
  <div className="flex flex-col items-center gap-y-1 pb-2">
    <span className="y2k-wordmark y2k-hero-number text-[44px]">{STORE_NAME}</span>
    <span className="text-ui-fg-muted txt-compact-xsmall-plus uppercase tracking-[0.28em]">
      Honduras
    </span>
    <Motto size="lg" className="y2k-rise max-w-[22rem] pt-5 text-center" />
  </div>
)

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBrandWidget
