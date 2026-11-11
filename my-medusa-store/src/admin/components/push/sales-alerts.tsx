import { BellAlert, Spinner } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { ReactNode, useState } from "react"

import {
  DeviceState,
  PushDevice,
  usePushStatus,
  useDevicePush,
} from "../../lib/push"

/** "Ahora no" on the orders list is remembered per browser. */
const DISMISS_KEY = "y2k-sales-alerts-dismissed"

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1"
  } catch {
    return false
  }
}

const rememberDismissed = () => {
  try {
    localStorage.setItem(DISMISS_KEY, "1")
  } catch {
    // Storage blocked: the banner just comes back next time.
  }
}

/** Only asked once `isAppleMobile()` said yes; iPadOS reports itself as a Mac. */
const appleDevice = (): string =>
  /iPhone|iPod/.test(navigator.userAgent) ? "iPhone" : "iPad"

const INSTALL_STEPS =
  "En Safari toca Compartir y elige «Agregar a pantalla de inicio». Luego abre el panel desde el ícono Y2K Admin y activa las alertas ahí."

/**
 * Top of the orders list: offers alerts on this device, and only while there
 * is something to do about them. Once they are on, or after "Ahora no", it
 * stays out of the way; Ajustes → Perfil has the full controls.
 */
export const SalesAlertsBanner = () => {
  const [dismissed, setDismissed] = useState(readDismissed)

  if (dismissed) {
    return null
  }

  return (
    <BannerContent
      onDismiss={() => {
        rememberDismissed()
        setDismissed(true)
        toast.info("Puedes activarlas cuando quieras en Ajustes → Perfil.")
      }}
    />
  )
}

const BannerContent = ({ onDismiss }: { onDismiss: () => void }) => {
  const { data: status } = usePushStatus()
  const push = useDevicePush(status)

  if (!status?.configured) {
    return null
  }

  if (push.state === "needs-install") {
    return (
      <BannerFrame
        title={`Recibe las alertas de ventas en este ${appleDevice()}`}
        description={`El ${appleDevice()} solo avisa desde la app de inicio. ${INSTALL_STEPS}`}
      >
        <Button size="small" variant="secondary" onClick={onDismiss}>
          Entendido
        </Button>
      </BannerFrame>
    )
  }

  if (push.state !== "off") {
    return null
  }

  return (
    <BannerFrame
      title="Alertas de ventas en este dispositivo"
      description="Te avisamos al momento cada vez que entra un pedido o un cliente sube el comprobante de su transferencia."
    >
      <Button size="small" variant="secondary" onClick={onDismiss}>
        Ahora no
      </Button>
      <Button size="small" onClick={push.enable} isLoading={push.enabling}>
        Activar alertas
      </Button>
    </BannerFrame>
  )
}

const BannerFrame = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) => (
  <Container className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
    <div className="flex items-start gap-3">
      <BellAlert className="text-ui-fg-subtle mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1">
        <Text size="small" leading="compact" weight="plus">
          {title}
        </Text>
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {description}
        </Text>
      </div>
    </div>
    <div className="flex shrink-0 justify-end gap-2">{children}</div>
  </Container>
)

const STATE_BADGE: Partial<
  Record<DeviceState, { label: string; color: "green" | "grey" | "red" | "orange" }>
> = {
  on: { label: "Activas", color: "green" },
  off: { label: "Desactivadas", color: "grey" },
  blocked: { label: "Bloqueadas", color: "red" },
  "needs-install": { label: "Falta instalar", color: "orange" },
  unsupported: { label: "No disponibles", color: "grey" },
}

const stateDescription = (state: DeviceState): string => {
  switch (state) {
    case "checking":
      return "Revisando este dispositivo…"
    case "on":
      return "Este dispositivo recibe un aviso por cada pedido nuevo y cada comprobante."
    case "off":
      return "Este dispositivo no recibe avisos."
    case "blocked":
      return "Las notificaciones del panel están bloqueadas. Actívalas en los ajustes del dispositivo (en iPhone: Ajustes → Notificaciones → Y2K Admin) y vuelve a esta página."
    case "needs-install":
      return `En ${appleDevice()} los avisos solo llegan a la app de inicio. ${INSTALL_STEPS}`
    case "unsupported":
      return "Este navegador no puede recibir notificaciones del panel."
  }
}

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("es-HN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
}

/** Ajustes → Perfil: alerts on this device, the user's other devices, a test. */
export const SalesAlertsCard = () => {
  const { data: status, isLoading, isError } = usePushStatus()
  const push = useDevicePush(status)
  const devices = status?.devices ?? []
  const badge = STATE_BADGE[push.state]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">Alertas de ventas</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Un aviso en tus dispositivos por cada pedido nuevo y cada
            comprobante de transferencia. Los comprobantes también llegan por
            correo.
          </Text>
        </div>
        {status?.configured && devices.length > 0 && (
          <Button
            size="small"
            variant="secondary"
            className="shrink-0"
            onClick={() => push.test.mutate()}
            isLoading={push.test.isPending}
          >
            Enviar prueba
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-6 py-4">
          <Spinner className="text-ui-fg-subtle animate-spin" />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Cargando…
          </Text>
        </div>
      ) : isError || !status ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-error">
            No se pudo cargar el estado de las alertas.
          </Text>
        </div>
      ) : !status.configured ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            El servidor todavía no puede enviar alertas: faltan las variables
            WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY y WEB_PUSH_SUBJECT.
          </Text>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Text size="small" leading="compact" weight="plus">
                  Este dispositivo
                </Text>
                {badge && (
                  <Badge size="2xsmall" color={badge.color}>
                    {badge.label}
                  </Badge>
                )}
              </div>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {stateDescription(push.state)}
              </Text>
            </div>
            <div className="flex shrink-0 justify-end">
              {push.state === "off" && (
                <Button
                  size="small"
                  onClick={push.enable}
                  isLoading={push.enabling}
                >
                  Activar alertas
                </Button>
              )}
              {push.state === "on" && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => push.disable.mutate()}
                  isLoading={push.disable.isPending}
                >
                  Desactivar
                </Button>
              )}
            </div>
          </div>

          {devices.length > 0 && (
            <div className="flex flex-col gap-3 px-6 py-4">
              <Text size="small" leading="compact" weight="plus">
                Dispositivos con alertas
              </Text>
              <ul className="flex flex-col gap-2">
                {devices.map((device) => (
                  <DeviceRow
                    key={device.id}
                    device={device}
                    isThisDevice={device.endpoint === push.endpoint}
                    removing={
                      push.remove.isPending &&
                      push.remove.variables?.id === device.id
                    }
                    onRemove={() => push.remove.mutate(device)}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Container>
  )
}

const DeviceRow = ({
  device,
  isThisDevice,
  removing,
  onRemove,
}: {
  device: PushDevice
  isThisDevice: boolean
  removing: boolean
  onRemove: () => void
}) => {
  const since = formatDate(device.created_at)

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Text size="small" leading="compact">
            {device.device}
          </Text>
          {isThisDevice && (
            <Badge size="2xsmall" color="blue">
              Este dispositivo
            </Badge>
          )}
          {!device.current_key && (
            <Badge size="2xsmall" color="orange">
              Hay que volver a activarlas
            </Badge>
          )}
        </div>
        {since && (
          <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
            Desde el {since}
          </Text>
        )}
      </div>
      <Button
        size="small"
        variant="transparent"
        className="shrink-0"
        onClick={onRemove}
        isLoading={removing}
      >
        Quitar
      </Button>
    </li>
  )
}
