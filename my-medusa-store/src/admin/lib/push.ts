import { toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"

import { sdk } from "./client"

/**
 * Sales alerts on the device in hand: the browser half of
 * `src/lib/admin-push.ts`. The service worker and the manifest come from
 * `src/admin/public`, and are found through the `<link rel="manifest">` that
 * medusa-config.ts adds to the admin's page, so nothing here hardcodes /app.
 */

export type PushDevice = {
  id: string
  endpoint: string
  device: string
  created_at: string
  current_key: boolean
}

export type PushStatus = {
  configured: boolean
  public_key: string | null
  devices: PushDevice[]
}

export type AlertDelivery = {
  sent: number
  removed: number
  failed: number
  skipped: number
}

/**
 * - `checking`: still asking the browser.
 * - `needs-install`: an iPhone/iPad in a Safari tab. iOS only delivers alerts
 *   to the Home Screen app, so the way forward is installing it.
 * - `unsupported`: this browser (or this server) cannot do Web Push.
 * - `blocked`: alerts were refused; only the device's settings can undo it.
 * - `off` / `on`: whether this device gets the alerts.
 */
export type DeviceState =
  | "checking"
  | "needs-install"
  | "unsupported"
  | "blocked"
  | "off"
  | "on"

const STATUS_KEY = ["admin-push"]

export const usePushStatus = () =>
  useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => sdk.client.fetch<PushStatus>("/admin/push"),
  })

const pwaPaths = (): { scope: string; worker: string } | null => {
  const manifest = document.querySelector<HTMLLinkElement>(
    'link[rel="manifest"]'
  )
  if (!manifest?.href) {
    return null
  }
  // The manifest sits one folder below the admin's root (`/app/pwa-v1/…`).
  const root = new URL("../", manifest.href)
  return { scope: root.pathname, worker: new URL("sw.js", root).href }
}

export const isAppleMobile = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  // iPadOS asks for the desktop site and says it is a Mac.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const isPushCapable = (): boolean =>
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window

const keyBytes = (base64Url: string) => {
  const raw = atob(
    (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
      .replace(/-/g, "+")
      .replace(/_/g, "/")
  )
  // Built over a plain ArrayBuffer: `applicationServerKey` takes no other.
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index++) {
    bytes[index] = raw.charCodeAt(index)
  }
  return bytes
}

/** Whether the browser subscribed with the key the server signs with now. */
const subscribedWith = (subscription: PushSubscription, publicKey: string) => {
  const current = subscription.options.applicationServerKey
  if (!current) {
    return false
  }
  const a = new Uint8Array(current)
  const b = keyBytes(publicKey)
  return a.length === b.length && a.every((byte, index) => byte === b[index])
}

const registerWorker = async (): Promise<ServiceWorkerRegistration> => {
  const paths = pwaPaths()
  if (!paths) {
    throw new Error("Falta el manifest de la app en esta página.")
  }
  await navigator.serviceWorker.register(paths.worker, {
    scope: paths.scope,
    updateViaCache: "none",
  })
  // Subscribing needs an active worker, not just a registered one.
  return navigator.serviceWorker.ready
}

const saveSubscription = (subscription: PushSubscription) =>
  sdk.client.fetch<{ device: PushDevice | null }>(
    "/admin/push/subscriptions",
    { method: "POST", body: subscription.toJSON() }
  )

const sendTest = () =>
  sdk.client.fetch<AlertDelivery>("/admin/push/sample", { method: "POST" })

const deleteDevice = (id: string) =>
  sdk.client.fetch(`/admin/push/subscriptions/${id}`, { method: "DELETE" })

/**
 * The server's own message when it sent one, the fallback otherwise, plus
 * the HTTP status when there is one. The SDK's FetchError falls back to the
 * status text when the body carries no message (an HTML 404, a proxy 502),
 * and over HTTP/2, which is how Railway serves the admin, that text is
 * empty. Without the code, a 404 read as an unexplained failure.
 */
const errorMessage = (error: unknown, fallback: string): string => {
  const { message, status, statusText } = (error ?? {}) as {
    message?: unknown
    status?: unknown
    statusText?: unknown
  }
  const detail =
    typeof message === "string" && message && message !== statusText
      ? message
      : ""
  const text = detail || fallback
  const code = typeof status === "number" ? ` (${status})` : ""
  return text.endsWith(".") ? `${text.slice(0, -1)}${code}.` : `${text}${code}`
}

/**
 * State and actions for alerts on this device. When the browser already holds
 * a subscription the server does not list (cleared metadata, a reinstall), it
 * is quietly sent again, so a device that says "on" really gets the alerts.
 */
export const useDevicePush = (status: PushStatus | undefined) => {
  const queryClient = useQueryClient()
  const [state, setState] = useState<DeviceState>("checking")
  const [endpoint, setEndpoint] = useState<string | null>(null)
  const registration = useRef<ServiceWorkerRegistration | null>(null)
  const subscription = useRef<PushSubscription | null>(null)

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
    [queryClient]
  )

  useEffect(() => {
    if (!status) {
      return
    }

    let cancelled = false

    const check = async (): Promise<DeviceState> => {
      if (!pwaPaths() || !status.configured || !status.public_key) {
        return "unsupported"
      }
      if (!isPushCapable()) {
        return isAppleMobile() && !isStandalone()
          ? "needs-install"
          : "unsupported"
      }
      if (Notification.permission === "denied") {
        return "blocked"
      }

      // Registered before any tap, so that "Activar" can ask for the
      // permission at once: Safari only shows the prompt right after a gesture.
      const ready = await registerWorker()
      registration.current = ready
      const current = await ready.pushManager.getSubscription()
      subscription.current = current

      if (!current || !subscribedWith(current, status.public_key)) {
        return "off"
      }

      setEndpoint(current.endpoint)
      if (
        !status.devices.some((device) => device.endpoint === current.endpoint)
      ) {
        await saveSubscription(current)
        await refresh()
      }
      return "on"
    }

    check()
      .then((next) => {
        if (!cancelled) {
          setState(next)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("unsupported")
        }
      })

    return () => {
      cancelled = true
    }
  }, [status, refresh])

  /**
   * Starts the subscription inside the tap itself, before anything is
   * awaited, which is what keeps Safari's permission prompt allowed.
   */
  const requestSubscription = (): Promise<PushSubscription> => {
    const publicKey = status?.public_key
    const ready = registration.current
    if (!publicKey || !ready) {
      return Promise.reject(
        new Error("Las alertas todavía no están listas en este dispositivo.")
      )
    }

    const options = {
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }
    const current = subscription.current
    if (current && subscribedWith(current, publicKey)) {
      return Promise.resolve(current)
    }
    if (current) {
      // Made with a key the server no longer uses: replace it.
      return current
        .unsubscribe()
        .then(() => ready.pushManager.subscribe(options))
    }
    return ready.pushManager.subscribe(options)
  }

  const enableMutation = useMutation({
    mutationFn: async (pending: Promise<PushSubscription>) => {
      let current: PushSubscription
      try {
        current = await pending
      } catch (error) {
        if (Notification.permission === "denied") {
          setState("blocked")
          throw new Error(
            "Las notificaciones del panel están bloqueadas en este dispositivo."
          )
        }
        throw error
      }

      subscription.current = current
      await saveSubscription(current)
      setEndpoint(current.endpoint)
      setState("on")

      // Alerts are on at this point; the sample only proves delivery, so a
      // failure is reported but does not undo anything. It used to be
      // swallowed, which is how a 404 on the sample route went unnoticed.
      try {
        return { delivery: await sendTest(), sampleError: null }
      } catch (error) {
        return { delivery: null, sampleError: error }
      }
    },
    onSuccess: ({ delivery, sampleError }) => {
      refresh()
      if (sampleError) {
        toast.warning("Alertas activadas, pero la prueba no se pudo enviar.", {
          description: errorMessage(
            sampleError,
            "Vuelve a intentarlo con «Enviar prueba» en Ajustes → Perfil."
          ),
        })
      } else if (!delivery?.sent) {
        toast.warning(
          "Alertas activadas, pero la prueba no llegó a ningún dispositivo."
        )
      } else {
        toast.success("Alertas activadas. Te enviamos una de prueba.")
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, "No se pudieron activar las alertas."))
    },
  })

  const enable = () => {
    const pending = requestSubscription()
    // Handled inside the mutation; this only keeps the browser from
    // reporting the rejection before the mutation gets to it.
    pending.catch(() => undefined)
    enableMutation.mutate(pending)
  }

  const disable = useMutation({
    mutationFn: async () => {
      const current = subscription.current
      const id = status?.devices.find(
        (device) => device.endpoint === current?.endpoint
      )?.id

      await current?.unsubscribe()
      subscription.current = null
      setEndpoint(null)
      setState("off")

      if (id) {
        await deleteDevice(id)
      }
    },
    onSuccess: () => {
      refresh()
      toast.success("Alertas desactivadas en este dispositivo.")
    },
    onError: (error) => {
      toast.error(errorMessage(error, "No se pudieron desactivar las alertas."))
    },
  })

  const test = useMutation({
    mutationFn: sendTest,
    onSuccess: (delivery) => {
      refresh()
      if (delivery.sent === 0) {
        toast.error("Ningún dispositivo recibió la alerta de prueba.")
      } else {
        toast.success(
          delivery.sent === 1
            ? "Alerta de prueba enviada."
            : `Alerta de prueba enviada a ${delivery.sent} dispositivos.`
        )
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, "No se pudo enviar la alerta de prueba."))
    },
  })

  const remove = useMutation({
    mutationFn: async (device: PushDevice) => {
      const current = subscription.current
      if (current && device.endpoint === current.endpoint) {
        await current.unsubscribe()
        subscription.current = null
        setEndpoint(null)
        setState("off")
      }
      await deleteDevice(device.id)
    },
    onSuccess: () => {
      refresh()
      toast.success("Dispositivo quitado.")
    },
    onError: (error) => {
      toast.error(errorMessage(error, "No se pudo quitar el dispositivo."))
    },
  })

  return {
    state,
    endpoint,
    enable,
    enabling: enableMutation.isPending,
    disable,
    test,
    remove,
  }
}
