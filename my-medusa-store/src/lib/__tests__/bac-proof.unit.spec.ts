import { detectProofType, safeBaseName } from "../bac-proof"

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
