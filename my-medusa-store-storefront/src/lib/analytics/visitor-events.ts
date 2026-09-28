/**
 * Visitor beacons for the admin dashboard's live view and traffic figures.
 *
 * The browser only sends what it alone knows: two random ids, the page, and
 * where the visit came from. `/api/analytics` adds the rest (device, city,
 * whether there is a cart) and forwards it to the backend. No IP address,
 * name or email is sent or stored.
 *
 * Ids live in localStorage: `vid` for the browser, `sid` for the visit, which
 * ends after 30 minutes without activity, as in Shopify and Google Analytics.
 */

export type VisitorEventType =
  | "pageview"
  | "ping"
  | "leave"
  | "add_to_cart"
  | "whatsapp"
  | "purchase"

const ENDPOINT = "/api/analytics"
const STATE_KEY = "y2k_visit"
const OPT_OUT_KEY = "y2k_notrack"
const SESSION_IDLE_MS = 30 * 60 * 1000

/** Click-id and share parameters, reported by name only, never by value. */
const CLICK_IDS = ["gclid", "ttclid", "fbclid", "igsh", "mibextid"] as const

type VisitState = { vid: string; sid: string; last: number }

/** Used when localStorage is unavailable, so ids at least hold for the page. */
let memoryState: VisitState | null = null

/** The referrer only means something on the first page of a page load. */
let firstPageview = true

const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")

const readState = (): VisitState | null => {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    return raw ? (JSON.parse(raw) as VisitState) : memoryState
  } catch {
    return memoryState
  }
}

const writeState = (state: VisitState) => {
  memoryState = state
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // Private mode or storage full: the in-memory copy carries the page.
  }
}

/**
 * `?notrack=1` once in a browser stops it being counted; `?notrack=0` undoes
 * it. For the owner, who places orders through the shop and would otherwise
 * count as a visitor every time.
 */
export const applyOptOutFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get("notrack")
  try {
    if (value === "1") {
      localStorage.setItem(OPT_OUT_KEY, "1")
    } else if (value === "0") {
      localStorage.removeItem(OPT_OUT_KEY)
    }
  } catch {
    // Without storage the choice cannot stick; nothing else to do.
  }
}

const optedOut = () => {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1"
  } catch {
    return false
  }
}

const send = (body: Record<string, unknown>) => {
  const json = JSON.stringify(body)
  try {
    // A beacon survives the page closing, which "leave" depends on.
    if (
      navigator.sendBeacon?.(ENDPOINT, new Blob([json], { type: "application/json" }))
    ) {
      return
    }
  } catch {
    // Fall through to fetch.
  }
  fetch(ENDPOINT, {
    method: "POST",
    body: json,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  }).catch(() => {})
}

export const trackVisitorEvent = (type: VisitorEventType) => {
  if (typeof window === "undefined" || navigator.webdriver || optedOut()) {
    return
  }

  const now = Date.now()
  const state = readState()

  if (type === "leave") {
    // Nothing to leave without a visit, and leaving must not start one.
    if (state?.sid) {
      send({ type, vid: state.vid, sid: state.sid, path: window.location.pathname })
    }
    return
  }

  const newVisitor = !state?.vid
  const newSession = !state?.sid || now - state.last > SESSION_IDLE_MS
  const vid = state?.vid ?? randomId()
  const sid = newSession ? randomId() : state!.sid
  writeState({ vid, sid, last: now })

  const body: Record<string, unknown> = {
    type,
    vid,
    sid,
    path: window.location.pathname,
  }

  if (type === "pageview") {
    if (newSession && firstPageview) {
      const params = new URLSearchParams(window.location.search)
      body.ref = document.referrer || undefined
      body.utm = params.get("utm_source")?.slice(0, 64) || undefined
      body.clid = CLICK_IDS.find((name) => params.has(name))
    }
    if (newVisitor) {
      body.nv = true
    }
    firstPageview = false
  }

  send(body)
}
