import Medusa from "@medusajs/js-sdk"

import { LANG_HEADER, getLang } from "../i18n/lang"

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})

/**
 * Every request of the panel says which language it is being read in, so a
 * route that answers with a message (an order that cannot be created, a cart
 * that is gone) words it in that language: see src/lib/admin-lang.ts. The
 * language is read when the request is made, so it follows a change at once.
 */
const send = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = ((input, init) =>
  send(input, {
    ...init,
    headers: { [LANG_HEADER]: getLang(), ...init?.headers },
  })) as typeof sdk.client.fetch
