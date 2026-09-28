import { bacProofReceivedOwner } from "../../modules/notification-resend/templates/bac-proof-received-owner"
import {
  detectProofType,
  newProofKey,
  proofObjectKey,
  safeBaseName,
  signProofs,
} from "../bac-proof"

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
])
const PDF = Buffer.from("%PDF-1.7\n%\xe2\xe3", "binary")

describe("detectProofType", () => {
  it("recognises the four accepted proof formats", () => {
    expect(detectProofType(PNG)).toEqual({ mime: "image/png", extension: "png" })
    expect(detectProofType(JPEG)).toEqual({
      mime: "image/jpeg",
      extension: "jpg",
    })
    expect(detectProofType(WEBP)).toEqual({
      mime: "image/webp",
      extension: "webp",
    })
    expect(detectProofType(PDF)).toEqual({
      mime: "application/pdf",
      extension: "pdf",
    })
  })

  it("rejects content that is not a receipt, whatever it claims to be", () => {
    expect(detectProofType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull()
    expect(detectProofType(Buffer.from("<svg onload=alert(1)>"))).toBeNull()
    expect(detectProofType(Buffer.from("GIF89a"))).toBeNull()
    expect(detectProofType(Buffer.from("PK\x03\x04", "binary"))).toBeNull()
  })

  it("rejects a RIFF container that is not WEBP", () => {
    const wav = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from("WAVE", "ascii"),
    ])
    expect(detectProofType(wav)).toBeNull()
  })

  it("rejects truncated buffers instead of reading past the end", () => {
    expect(detectProofType(Buffer.alloc(0))).toBeNull()
    expect(detectProofType(PNG.subarray(0, 4))).toBeNull()
    expect(detectProofType(WEBP.subarray(0, 6))).toBeNull()
  })
})

describe("safeBaseName", () => {
  it("strips path separators and the client extension", () => {
    expect(safeBaseName("../../etc/passwd")).toBe("etc_passwd")
    expect(safeBaseName("comprobante.png")).toBe("comprobante")
    expect(safeBaseName("payload.php.html")).toBe("payload_php")
  })

  it("never returns an empty name", () => {
    expect(safeBaseName("")).toBe("comprobante")
    expect(safeBaseName(".png")).toBe("comprobante")
    expect(safeBaseName("///")).toBe("comprobante")
  })

  it("keeps the name short", () => {
    expect(safeBaseName("a".repeat(500) + ".png").length).toBeLessThanOrEqual(60)
  })
})

// The shape production actually has: the media domain carries the bucket name
// in its path, and the upload route encoded every key segment into the URL.
const MEDIA = "https://media.example.com/y2k-fit-store-hn"

describe("newProofKey", () => {
  it("files each proof under its order, named after the sniffed type", () => {
    expect(newProofKey("order_01ABC", "Mi comprobante.HTML", "png", 1758000000000)).toBe(
      "bank-transfers/order_01ABC/1758000000000-Mi_comprobante.png"
    )
  })
})

describe("proofObjectKey", () => {
  it("uses the stored key of a current entry as is", () => {
    expect(
      proofObjectKey(
        { key: "bank-transfers/o/1-a.png", uploaded_at: "" },
        MEDIA
      )
    ).toBe("bank-transfers/o/1-a.png")
  })

  it("recovers the key from the public URL of an older entry", () => {
    const key = "bank-transfers/order_01ABC/1758000000000-recibo_ñ.jpg"
    // Exactly how the upload route used to build it.
    const url = `${MEDIA}/${key.split("/").map(encodeURIComponent).join("/")}`

    expect(proofObjectKey({ url, uploaded_at: "" }, MEDIA)).toBe(key)
    expect(proofObjectKey({ url, uploaded_at: "" }, `${MEDIA}/`)).toBe(key)
  })

  it("refuses a URL that is not under the media base", () => {
    expect(
      proofObjectKey(
        { url: "https://evil.example.com/bank-transfers/o/a.png", uploaded_at: "" },
        MEDIA
      )
    ).toBeNull()
    expect(
      proofObjectKey({ url: `${MEDIA}/bank-transfers/o/a.png`, uploaded_at: "" }, undefined)
    ).toBeNull()
    expect(proofObjectKey({ uploaded_at: "" }, MEDIA)).toBeNull()
  })

  it("does not throw on a malformed escape", () => {
    expect(
      proofObjectKey({ url: `${MEDIA}/bank-transfers/%E0%A4%A.png`, uploaded_at: "" }, MEDIA)
    ).toBeNull()
  })
})

describe("signProofs", () => {
  it("signs current and older entries alike, and flags PDFs", async () => {
    const sign = jest.fn(async (key: string) => `https://signed.example/${key}?sig=1`)

    const proofs = await signProofs(
      [
        { key: "bank-transfers/o/1-a.png", uploaded_at: "2026-09-27T10:00:00.000Z" },
        { url: `${MEDIA}/bank-transfers/o/2-b.pdf`, uploaded_at: "2026-09-27T11:00:00.000Z" },
        { url: "https://elsewhere.example/c.png", uploaded_at: "2026-09-27T12:00:00.000Z" },
      ],
      MEDIA,
      sign
    )

    expect(proofs).toEqual([
      {
        url: "https://signed.example/bank-transfers/o/1-a.png?sig=1",
        uploaded_at: "2026-09-27T10:00:00.000Z",
        is_pdf: false,
      },
      {
        url: "https://signed.example/bank-transfers/o/2-b.pdf?sig=1",
        uploaded_at: "2026-09-27T11:00:00.000Z",
        is_pdf: true,
      },
      // Unresolvable: no URL at all rather than a public one.
      { url: null, uploaded_at: "2026-09-27T12:00:00.000Z", is_pdf: false },
    ])
    expect(sign).toHaveBeenCalledTimes(2)
  })
})

describe("bac-proof-received-owner email", () => {
  it("says how many files arrived and links to the admin, never to a file", () => {
    const { html, text } = bacProofReceivedOwner({
      order_id: "order_01ABC",
      order_display_id: 42,
      admin_url: "https://api.example.com/app/orders/order_01ABC",
      proof_count: 2,
    })

    expect(html).toContain("2 archivos adjuntos")
    expect(text).toContain("2 archivos adjuntos")
    expect(html).toContain("https://api.example.com/app/orders/order_01ABC")
    expect(html).not.toContain("bank-transfers")
    expect(text).not.toContain("bank-transfers")
  })
})
