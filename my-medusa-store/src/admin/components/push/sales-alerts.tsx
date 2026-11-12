import { BellAlert, Spinner } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { ReactNode, useState } from "react"

import type { Dict } from "../../i18n/dictionary"
import { dateLocale } from "../../i18n/lang"
import { useLang, useT } from "../../i18n/use-t"
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

/**
 * Top of the orders list: offers alerts on this device, and only while there
 * is something to do about them. Once they are on, or after "Ahora no", it
 * stays out of the way; Ajustes → Perfil has the full controls.
 */
export const SalesAlertsBanner = () => {
  const words = useT().alerts
  const [dismissed, setDismissed] = useState(readDismissed)

  if (dismissed) {
    return null
  }

  return (
    <BannerContent
      onDismiss={() => {
        rememberDismissed()
        setDismissed(true)
        toast.info(words.dismissedHint)
      }}
    />
  )
}

const BannerContent = ({ onDismiss }: { onDismiss: () => void }) => {
  const words = useT().alerts
  const { data: status } = usePushStatus()
  const push = useDevicePush(status)

  if (!status?.configured) {
    return null
  }

  if (push.state === "needs-install") {
    return (
      <BannerFrame
        title={words.installTitle(appleDevice())}
        description={words.installDescription(appleDevice(), words.installSteps)}
      >
        <Button size="small" variant="secondary" onClick={onDismiss}>
          {words.understood}
        </Button>
      </BannerFrame>
    )
  }

  if (push.state !== "off") {
    return null
  }

  return (
    <BannerFrame
      title={words.bannerTitle}
      description={words.bannerDescription}
    >
      <Button size="small" variant="secondary" onClick={onDismiss}>
        {words.notNow}
      </Button>
      <Button size="small" onClick={push.enable} isLoading={push.enabling}>
        {words.enable}
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

/** The color of each state's badge; its word is in the dictionary. */
const STATE_COLOR: Partial<Record<DeviceState, "green" | "grey" | "red" | "orange">> = {
  on: "green",
  off: "grey",
  blocked: "red",
  "needs-install": "orange",
  unsupported: "grey",
}

const stateDescription = (state: DeviceState, words: Dict["alerts"]): string => {
  switch (state) {
    case "checking":
      return words.describe.checking
    case "on":
      return words.describe.on
    case "off":
      return words.describe.off
    case "blocked":
      return words.describe.blocked
    case "needs-install":
      return words.describe.needsInstall(appleDevice(), words.installSteps)
    case "unsupported":
      return words.describe.unsupported
  }
}

const formatDate = (iso: string, locale: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
}

/** Ajustes → Perfil: alerts on this device, the user's other devices, a test. */
export const SalesAlertsCard = () => {
  const words = useT().alerts
  const { data: status, isLoading, isError } = usePushStatus()
  const push = useDevicePush(status)
  const devices = status?.devices ?? []
  const badgeColor = STATE_COLOR[push.state]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{words.title}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.description}
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
            {words.sendTest}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-6 py-4">
          <Spinner className="text-ui-fg-subtle animate-spin" />
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.loading}
          </Text>
        </div>
      ) : isError || !status ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-error">
            {words.loadError}
          </Text>
        </div>
      ) : !status.configured ? (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {words.notConfigured}
          </Text>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Text size="small" leading="compact" weight="plus">
                  {words.thisDevice}
                </Text>
                {badgeColor && (
                  <Badge size="2xsmall" color={badgeColor}>
                    {words.states[push.state]}
                  </Badge>
                )}
              </div>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {stateDescription(push.state, words)}
              </Text>
            </div>
            <div className="flex shrink-0 justify-end">
              {push.state === "off" && (
                <Button
                  size="small"
                  onClick={push.enable}
                  isLoading={push.enabling}
                >
                  {words.enable}
                </Button>
              )}
              {push.state === "on" && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => push.disable.mutate()}
                  isLoading={push.disable.isPending}
                >
                  {words.disable}
                </Button>
              )}
            </div>
          </div>

          {devices.length > 0 && (
            <div className="flex flex-col gap-3 px-6 py-4">
              <Text size="small" leading="compact" weight="plus">
                {words.devices}
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
  const words = useT().alerts
  const since = formatDate(device.created_at, dateLocale(useLang()))

  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Text size="small" leading="compact">
            {device.device}
          </Text>
          {isThisDevice && (
            <Badge size="2xsmall" color="blue">
              {words.thisDevice}
            </Badge>
          )}
          {!device.current_key && (
            <Badge size="2xsmall" color="orange">
              {words.reactivate}
            </Badge>
          )}
        </div>
        {since && (
          <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
            {words.since(since)}
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
        {words.remove}
      </Button>
    </li>
  )
}
