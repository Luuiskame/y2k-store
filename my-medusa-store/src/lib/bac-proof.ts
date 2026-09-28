/**
 * Shared limits and validation for BAC transfer proofs.
 *
 * These exist because the upload endpoint is, by design, only protected by
 * knowledge of the order id (guest checkout has no session to authenticate
 * against — same trade-off Medusa core makes for `GET /store/orders/:id`).
 * That makes every limit below the *only* thing standing between one shared
 * order link and an unbounded write into R2, the order metadata and the
 * notification queue.
 */

/** Hard ceiling on how many proof files a single order can ever accumulate. */
export const MAX_PROOFS_PER_ORDER = 6

/** Files accepted in one request. Enforced by multer and re-checked here. */
export const MAX_FILES_PER_REQUEST = 3

/** Per-file size ceiling, in bytes. Enforced by multer and re-checked here. */
export const MAX_FILE_SIZE = 8 * 1024 * 1024

/** Minimum gap between two accepted uploads for the same order, in seconds. */
export const UPLOAD_COOLDOWN_SECONDS = 30

/** Rolling window used by the per-IP limiter, in seconds. */
export const IP_WINDOW_SECONDS = 60 * 10

/** Requests one IP may make within `IP_WINDOW_SECONDS`, across all orders. */
export const MAX_REQUESTS_PER_IP = 10

/** Folder (key prefix) inside the R2 bucket where transfer proofs live. */
export const PROOF_FOLDER = "bank-transfers"

/**
 * One stored proof, as kept in `order.metadata.bac_transfer_proof`.
 *
 * `key` is the object's R2 key, exactly as passed to PutObject. A receipt is a
 * customer's bank data, so no public URL is stored or handed out any more: the
 * admin asks for a short-lived signed URL per file instead (see
 * `bac-proof-storage.ts` and `GET /admin/orders/:id/bac-proofs`).
 *
 * Entries written before that carry the public `url` instead of a `key`.
 * `proofObjectKey` recovers the key from it, so old and new entries are read
 * the same way.
 */
export type ProofFile = { key?: string; url?: string; uploaded_at: string }

/** The key a newly uploaded proof is stored under. */
export const newProofKey = (
  orderId: string,
  originalName: string,
  extension: string,
  now: number = Date.now()
): string =>
  `${PROOF_FOLDER}/${orderId}/${now}-${safeBaseName(originalName)}.${extension}`

/**
 * The R2 key a proof entry points at, or null when it cannot be worked out.
 *
 * Old entries stored `${R2_FILE_URL}/${key}` with each path segment
 * URI-encoded, so stripping the base and decoding each segment gives the
 * original key back exactly.
 */
export const proofObjectKey = (
  proof: ProofFile,
  publicBaseUrl: string | undefined
): string | null => {
  if (proof.key) {
    return proof.key
  }

  if (!proof.url || !publicBaseUrl) {
    return null
  }

  const base = `${publicBaseUrl.replace(/\/+$/, "")}/`
  if (!proof.url.startsWith(base)) {
    return null
  }

  try {
    return proof.url
      .slice(base.length)
      .split("/")
      .map(decodeURIComponent)
      .join("/")
  } catch {
    return null
  }
}

export type SignedProof = {
  /** Short-lived signed URL, or null when the entry could not be resolved. */
  url: string | null
  uploaded_at: string
  is_pdf: boolean
}

/**
 * What the admin widget receives for an order's proofs: every entry turned
 * into a signed URL, old ones included. `sign` is injected so this stays free
 * of the S3 client.
 */
export const signProofs = async (
  proofs: ProofFile[],
  publicBaseUrl: string | undefined,
  sign: (key: string) => Promise<string>
): Promise<SignedProof[]> =>
  Promise.all(
    proofs.map(async (proof) => {
      const key = proofObjectKey(proof, publicBaseUrl)
      return {
        url: key ? await sign(key) : null,
        uploaded_at: proof.uploaded_at,
        is_pdf: (key ?? proof.url ?? "").toLowerCase().endsWith(".pdf"),
      }
    })
  )

type AllowedType = {
  mime: string
  extension: string
  /** Returns true when the buffer's leading bytes match this format. */
  matches: (b: Buffer) => boolean
}

/**
 * Allow-list keyed on the file's actual bytes, not on the client-supplied
 * mimetype or filename. Both of those are attacker-controlled, and the objects
 * live in the same bucket as the store's public media — trusting `f.mimetype`
 * would let anyone host `text/html` on the store's own file domain.
 */
const ALLOWED_TYPES: AllowedType[] = [
  {
    mime: "image/png",
    extension: "png",
    matches: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    extension: "jpg",
    matches: (b) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/webp",
    extension: "webp",
    matches: (b) =>
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    mime: "application/pdf",
    extension: "pdf",
    matches: (b) => b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-",
  },
]

export const ACCEPTED_MIME_TYPES = ALLOWED_TYPES.map((t) => t.mime)

/**
 * Sniffs the buffer and returns the format we will store it as, or `null` when
 * the content is not one of the four accepted proof formats.
 */
export const detectProofType = (
  buffer: Buffer
): { mime: string; extension: string } | null => {
  const match = ALLOWED_TYPES.find((t) => t.matches(buffer))
  return match ? { mime: match.mime, extension: match.extension } : null
}

/**
 * Strips the client filename down to a safe basename. The extension is dropped
 * on purpose — the caller appends the one derived from the sniffed content, so
 * a `.html` upload cannot land on R2 under an executable-looking key.
 */
export const safeBaseName = (name: string): string => {
  const withoutExtension = name.replace(/\.[^.]{1,10}$/, "")
  const cleaned = withoutExtension.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-60)
  return cleaned.replace(/^_+|_+$/g, "") || "comprobante"
}
