import { NextRequest, NextResponse } from "next/server"
import { getAuthHeaders } from "@lib/data/cookies"
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE_MB,
} from "@lib/config/bac-proof"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
// Headroom over the theoretical max payload for multipart boundaries/fields.
const MAX_BODY_SIZE = MAX_FILES_PER_REQUEST * MAX_FILE_SIZE + 1024 * 1024

const reject = (message: string, status = 400) =>
  NextResponse.json({ message }, { status })

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  // Cheap rejection before we read the body into memory. The backend enforces
  // the real limits; this just keeps an oversized payload from being buffered
  // twice (once here, once in Medusa) on the way to a guaranteed 400.
  const declaredSize = Number(req.headers.get("content-length") ?? 0)
  if (declaredSize > MAX_BODY_SIZE) {
    return reject("El envío es demasiado grande.", 413)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return reject("No pudimos leer los archivos enviados.")
  }

  const files = formData.getAll("files").filter((v): v is File => v instanceof File)

  if (files.length === 0) {
    return reject("No se recibieron archivos.")
  }

  if (files.length > MAX_FILES_PER_REQUEST) {
    return reject(
      `Puedes enviar un máximo de ${MAX_FILES_PER_REQUEST} archivos a la vez.`
    )
  }

  if (files.some((f) => f.size > MAX_FILE_SIZE)) {
    return reject(`Cada archivo debe pesar menos de ${MAX_FILE_SIZE_MB}MB.`)
  }

  if (files.some((f) => !ACCEPTED_MIME_TYPES.includes(f.type as any))) {
    return reject("Solo aceptamos imágenes PNG, JPG o WEBP, o archivos PDF.")
  }

  // Forward only the files — anything else the client tacked onto the form is
  // dropped rather than passed through to the backend.
  const forwarded = new FormData()
  files.forEach((f) => forwarded.append("files", f, f.name))

  const authHeaders = await getAuthHeaders()

  const headers: Record<string, string> = {
    ...(authHeaders as Record<string, string>),
  }
  if (PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = PUBLISHABLE_KEY
  }
  // Pass the caller's address through so the backend limiter buckets by the
  // real client and not by this route handler's egress IP.
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    headers["x-forwarded-for"] = forwardedFor
  }

  const res = await fetch(`${BACKEND_URL}/store/orders/${id}/bac-proof`, {
    method: "POST",
    body: forwarded,
    headers,
  })

  const text = await res.text()
  const responseHeaders: Record<string, string> = {
    "Content-Type": res.headers.get("Content-Type") ?? "application/json",
  }
  const retryAfter = res.headers.get("Retry-After")
  if (retryAfter) {
    responseHeaders["Retry-After"] = retryAfter
  }

  return new NextResponse(text, {
    status: res.status,
    headers: responseHeaders,
  })
}
