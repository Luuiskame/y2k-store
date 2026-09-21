/**
 * Upload limits for BAC transfer proofs.
 *
 * Kept in sync by hand with `my-medusa-store/src/lib/bac-proof.ts`. The backend
 * is the one that enforces them; these values only drive the UI copy and let us
 * stop a pointless request before it leaves the browser.
 */

/** Hard ceiling on how many proof files a single order can ever accumulate. */
export const MAX_PROOFS_PER_ORDER = 6

/** Files accepted in one request. */
export const MAX_FILES_PER_REQUEST = 3

/** Per-file size ceiling, in megabytes. */
export const MAX_FILE_SIZE_MB = 8

/** Minimum gap between two accepted uploads for the same order, in seconds. */
export const UPLOAD_COOLDOWN_SECONDS = 30

export const ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const

export const ACCEPTED_ATTRIBUTE = ACCEPTED_MIME_TYPES.join(",")
