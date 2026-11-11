import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateUsersWorkflow } from "@medusajs/medusa/core-flows"
import { sendNotification } from "web-push"

import {
  ALERT_TTL_SECONDS,
  MAX_DEVICES_PER_USER,
  PUSH_METADATA_KEY,
  StoredPushSubscription,
  describeDevice,
  getVapidConfig,
  isAllowedPushEndpoint,
  newOrderAlert,
  proofReceivedAlert,
  readStoredSubscriptions,
  sendAdminAlert,
  subscriptionId,
  upsertSubscription,
} from "../admin-push"

jest.mock("web-push", () => ({ sendNotification: jest.fn() }))
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateUsersWorkflow: jest.fn(),
}))

const sendMock = sendNotification as jest.MockedFunction<typeof sendNotification>
const workflowMock = updateUsersWorkflow as unknown as jest.Mock

const VAPID = {
  WEB_PUSH_PUBLIC_KEY: "BPublicKeyForTests",
  WEB_PUSH_PRIVATE_KEY: "privateKeyForTests",
  WEB_PUSH_SUBJECT: "mailto:alertas@example.com",
}

const device = (
  endpoint: string,
  extra: Partial<StoredPushSubscription> = {}
): StoredPushSubscription => ({
  id: subscriptionId(endpoint),
  endpoint,
  keys: { p256dh: "p256dh-" + endpoint, auth: "auth-" + endpoint },
  device: "iPhone",
  vapid_key: VAPID.WEB_PUSH_PUBLIC_KEY,
  created_at: "2026-11-01T00:00:00.000Z",
  ...extra,
})

describe("getVapidConfig", () => {
  it("is off until both keys and a contact are there", () => {
    expect(getVapidConfig({})).toBeNull()
    expect(
      getVapidConfig({ WEB_PUSH_PUBLIC_KEY: "a", WEB_PUSH_PRIVATE_KEY: "b" })
    ).toBeNull()
  })

  it("falls back to the owner's email as the contact", () => {
    expect(
      getVapidConfig({
        WEB_PUSH_PUBLIC_KEY: " a ",
        WEB_PUSH_PRIVATE_KEY: "b",
        STORE_OWNER_EMAIL: "duena@example.com",
      })
    ).toEqual({ publicKey: "a", privateKey: "b", subject: "mailto:duena@example.com" })
  })

  it("prefers an explicit subject", () => {
    expect(
      getVapidConfig({ ...VAPID, STORE_OWNER_EMAIL: "duena@example.com" })?.subject
    ).toBe("mailto:alertas@example.com")
  })
})

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://web.push.apple.com/QGuQyavXutnMH",
    "https://fcm.googleapis.com/fcm/send/abc:def",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
  ])("accepts the browsers' push services: %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true)
  })

  it.each([
    "http://web.push.apple.com/abc",
    "https://push.apple.com.attacker.example/abc",
    "https://evilpush.apple.com/abc",
    "https://redis.railway.internal/",
    "not a url",
  ])("refuses anything else: %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false)
  })
})

describe("stored devices", () => {
  it("reads only well-formed entries and recomputes their ids", () => {
    const good = device("https://web.push.apple.com/one", { id: "tampered" })
    const devices = readStoredSubscriptions({
      [PUSH_METADATA_KEY]: [good, null, { endpoint: 3 }, { endpoint: "x" }],
    })

    expect(devices).toEqual([{ ...good, id: subscriptionId(good.endpoint) }])
    expect(readStoredSubscriptions({ [PUSH_METADATA_KEY]: "nope" })).toEqual([])
    expect(readStoredSubscriptions(null)).toEqual([])
  })

  it("adds a new device at the end", () => {
    const first = device("https://web.push.apple.com/one")
    const next = upsertSubscription(
      [first],
      {
        endpoint: "https://fcm.googleapis.com/fcm/send/two",
        keys: { p256dh: "k", auth: "a" },
        device: "Windows · Chrome",
        vapid_key: "key",
      },
      new Date("2026-11-11T10:00:00.000Z")
    )

    expect(next.map((d) => d.device)).toEqual(["iPhone", "Windows · Chrome"])
    expect(next[1].created_at).toBe("2026-11-11T10:00:00.000Z")
  })

  it("refreshes a known device, keeping when it was added", () => {
    const first = device("https://web.push.apple.com/one")
    const second = device("https://web.push.apple.com/two")
    const next = upsertSubscription([first, second], {
      endpoint: first.endpoint,
      keys: { p256dh: "new", auth: "new" },
      device: "iPhone",
      vapid_key: "rotated",
    })

    expect(next).toHaveLength(2)
    expect(next[1]).toMatchObject({
      endpoint: first.endpoint,
      keys: { p256dh: "new", auth: "new" },
      vapid_key: "rotated",
      created_at: first.created_at,
    })
  })

  it("drops the device silent the longest past the cap", () => {
    const devices = Array.from({ length: MAX_DEVICES_PER_USER }, (_, i) =>
      device(`https://web.push.apple.com/${i}`)
    )
    const next = upsertSubscription(devices, {
      endpoint: "https://web.push.apple.com/new",
      keys: { p256dh: "k", auth: "a" },
      device: "iPad",
      vapid_key: "key",
    })

    expect(next).toHaveLength(MAX_DEVICES_PER_USER)
    expect(next[0].endpoint).toBe("https://web.push.apple.com/1")
    expect(next[next.length - 1].device).toBe("iPad")
  })
})

describe("describeDevice", () => {
  it.each([
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      "iPhone",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      "Windows · Chrome",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
      "Windows · Edge",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
      "Mac · Safari",
    ],
    [
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36",
      "Android · Chrome",
    ],
    [undefined, "Dispositivo"],
  ])("%s → %s", (ua, label) => {
    expect(describeDevice(ua)).toBe(label)
  })
})

describe("alert copy", () => {
  const order = {
    id: "order_01",
    display_id: 1043,
    currency_code: "hnl",
    // Medusa hands totals over as BigNumbers; they convert through valueOf.
    total: { valueOf: () => 1250 },
    customer_name: "María López",
    city: "San Pedro Sula",
    item_count: 3,
  }

  it("announces a new order with who, where and how much", () => {
    const alert = newOrderAlert(order)
    expect(alert.title).toMatch(/^Nuevo pedido #1043 · L\s?1,250\.00$/)
    expect(alert.body).toBe("María López · San Pedro Sula · 3 artículos")
    expect(alert.url).toBe("orders/order_01")
    expect(alert.tag).toBe("order-order_01")
  })

  it("still says something useful with little to go on", () => {
    const alert = newOrderAlert({ id: "order_02", item_count: 1, total: null })
    expect(alert.title).toBe("Nuevo pedido")
    expect(alert.body).toBe("1 artículo")
    expect(newOrderAlert({ id: "order_03" }).body).toBe("Ábrelo para ver el detalle.")
  })

  it("asks for the receipt to be checked", () => {
    const alert = proofReceivedAlert(order, 1)
    expect(alert.title).toBe("Comprobante recibido · pedido #1043")
    expect(alert.body).toMatch(
      /^María López subió el comprobante de L\s?1,250\.00\. Revísalo y confirma el pago\.$/
    )
    expect(alert.tag).toBe("proof-order_01")

    expect(proofReceivedAlert({ id: "order_04" }, 2).body).toBe(
      "El cliente subió el comprobante (2 archivos). Revísalo y confirma el pago."
    )
  })
})

describe("sendAdminAlert", () => {
  const savedEnv = process.env

  const buildContainer = (users: { id: string; metadata: Record<string, unknown> }[]) => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    const query = {
      graph: jest.fn(async ({ filters }: { filters: { id?: string[] } }) => ({
        data: filters.id
          ? users.filter((user) => filters.id!.includes(user.id))
          : users,
      })),
    }
    const locking = {
      execute: jest.fn(async (_key: string, job: () => Promise<unknown>) => job()),
    }
    const container = {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.LOGGER) return logger
        if (key === ContainerRegistrationKeys.QUERY) return query
        if (key === Modules.LOCKING) return locking
        throw new Error(`unexpected container key: ${key}`)
      },
    }
    return { container: container as any, logger, query, locking }
  }

  const alert = { title: "Nuevo pedido #1", body: "Ana", url: "orders/order_1", tag: "order-order_1" }

  beforeEach(() => {
    process.env = { ...savedEnv, ...VAPID }
    sendMock.mockReset()
    workflowMock.mockReset()
    workflowMock.mockReturnValue({ run: jest.fn(async () => ({ result: [] })) })
  })

  afterAll(() => {
    process.env = savedEnv
  })

  it("delivers to every device, drops the gone ones and keeps the rest", async () => {
    const ok = device("https://web.push.apple.com/ok")
    const gone = device("https://web.push.apple.com/gone")
    const down = device("https://fcm.googleapis.com/fcm/send/down")
    const oldKey = device("https://web.push.apple.com/old", { vapid_key: "previous" })
    const other = device("https://web.push.apple.com/other")

    sendMock.mockImplementation(async (subscription) => {
      if (subscription.endpoint === gone.endpoint) {
        throw Object.assign(new Error("Received unexpected response code"), { statusCode: 410 })
      }
      if (subscription.endpoint === down.endpoint) {
        throw Object.assign(new Error("Received unexpected response code"), {
          statusCode: 503,
          body: "Service Unavailable",
        })
      }
      return { statusCode: 201, body: "", headers: {} }
    })

    const { container, logger } = buildContainer([
      { id: "user_owner", metadata: { other: "kept", [PUSH_METADATA_KEY]: [ok, gone, down, oldKey] } },
      { id: "user_staff", metadata: { [PUSH_METADATA_KEY]: [other] } },
    ])

    const delivery = await sendAdminAlert(container, alert)

    expect(delivery).toEqual({ sent: 2, removed: 1, failed: 1, skipped: 1 })
    expect(sendMock).toHaveBeenCalledTimes(4)

    const [subscription, payload, options] = sendMock.mock.calls[0]
    expect(subscription).toEqual({ endpoint: ok.endpoint, keys: ok.keys })
    expect(JSON.parse(payload as string)).toMatchObject({ ...alert, timestamp: expect.any(Number) })
    expect(options).toMatchObject({
      vapidDetails: {
        subject: VAPID.WEB_PUSH_SUBJECT,
        publicKey: VAPID.WEB_PUSH_PUBLIC_KEY,
        privateKey: VAPID.WEB_PUSH_PRIVATE_KEY,
      },
      TTL: ALERT_TTL_SECONDS,
      urgency: "high",
    })

    // Only the owner's list is rewritten, without the gone device; the
    // failing and the old-key devices stay for next time.
    expect(workflowMock).toHaveBeenCalledTimes(1)
    const run = workflowMock.mock.results[0].value.run as jest.Mock
    expect(run).toHaveBeenCalledWith({
      input: {
        updates: [
          { id: "user_owner", metadata: { [PUSH_METADATA_KEY]: [ok, down, oldKey] } },
        ],
      },
    })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("503 Service Unavailable"))
  })

  it("only reaches the users it is asked to", async () => {
    sendMock.mockResolvedValue({ statusCode: 201, body: "", headers: {} })
    const { container, query } = buildContainer([
      { id: "user_owner", metadata: { [PUSH_METADATA_KEY]: [device("https://web.push.apple.com/a")] } },
      { id: "user_staff", metadata: { [PUSH_METADATA_KEY]: [device("https://web.push.apple.com/b")] } },
    ])

    const delivery = await sendAdminAlert(container, alert, { userIds: ["user_staff"] })

    expect(delivery.sent).toBe(1)
    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { id: ["user_staff"] } })
    )
    expect(workflowMock).not.toHaveBeenCalled()
  })

  it("does nothing without keys", async () => {
    process.env = { ...savedEnv }
    delete process.env.WEB_PUSH_PUBLIC_KEY
    delete process.env.WEB_PUSH_PRIVATE_KEY
    const { container, query } = buildContainer([])

    expect(await sendAdminAlert(container, alert)).toEqual({
      sent: 0,
      removed: 0,
      failed: 0,
      skipped: 0,
    })
    expect(query.graph).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })
})
