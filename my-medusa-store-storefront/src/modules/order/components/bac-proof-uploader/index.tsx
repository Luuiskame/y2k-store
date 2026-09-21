"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import {
  ACCEPTED_ATTRIBUTE,
  ACCEPTED_MIME_TYPES,
  MAX_FILES_PER_REQUEST,
  MAX_FILE_SIZE_MB,
  MAX_PROOFS_PER_ORDER,
  UPLOAD_COOLDOWN_SECONDS,
} from "@lib/config/bac-proof"

type ProofFile = { url: string; uploaded_at: string }

type Props = {
  orderId: string
  initialProof: ProofFile[]
  hasUploaded: boolean
}

const WHATSAPP_HELP =
  "Si necesitas enviarnos otro archivo, escríbenos por WhatsApp y lo agregamos a tu pedido."

const BacProofUploader = ({ orderId, initialProof, hasUploaded }: Props) => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(hasUploaded)
  const [proof, setProof] = useState<ProofFile[]>(initialProof)
  const [cooldown, setCooldown] = useState(0)

  const remaining = Math.max(0, MAX_PROOFS_PER_ORDER - proof.length)
  const limitReached = remaining === 0
  // Per request we accept at most 3, but never more than the order has left.
  const allowedThisTurn = Math.min(MAX_FILES_PER_REQUEST, remaining)

  // Mirrors the server-side cooldown so the button reflects it, instead of the
  // customer discovering the limit through a 429.
  useEffect(() => {
    if (cooldown <= 0) {
      return
    }
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const onPick = (picked: FileList | null) => {
    setError(null)
    if (!picked) return

    const all = Array.from(picked)
    const arr = all.slice(0, allowedThisTurn)

    const wrongType = arr.find(
      (f) => !ACCEPTED_MIME_TYPES.includes(f.type as any)
    )
    if (wrongType) {
      setError("Solo aceptamos imágenes PNG, JPG o WEBP, o archivos PDF.")
      return
    }

    const tooBig = arr.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)
    if (tooBig) {
      setError(`Cada archivo debe pesar menos de ${MAX_FILE_SIZE_MB}MB.`)
      return
    }

    if (all.length > allowedThisTurn) {
      setError(
        `Solo puedes subir ${allowedThisTurn} archivo${
          allowedThisTurn === 1 ? "" : "s"
        } más. Tomamos los primeros.`
      )
    }

    setFiles(arr)
  }

  const onSubmit = async () => {
    if (files.length === 0) {
      setError("Selecciona al menos un archivo.")
      return
    }
    if (limitReached || cooldown > 0) {
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const fd = new FormData()
      files.forEach((f) => fd.append("files", f))
      const res = await fetch(
        `/api/orders/${orderId}/bac-proof`,
        {
          method: "POST",
          body: fd,
        }
      )
      const json = await res.json().catch(() => ({} as any))

      if (!res.ok) {
        // 429 carries how long to wait; 409 means the order hit its own cap.
        if (typeof json.retry_after === "number") {
          setCooldown(json.retry_after)
        }
        if (json.limit_reached) {
          setProof((prev) =>
            prev.length >= MAX_PROOFS_PER_ORDER
              ? prev
              : [
                  ...prev,
                  ...Array.from(
                    { length: MAX_PROOFS_PER_ORDER - prev.length },
                    () => ({ url: "", uploaded_at: "" })
                  ),
                ]
          )
        }
        throw new Error(json.message ?? "No pudimos subir el comprobante.")
      }

      if (Array.isArray(json.proof_files)) {
        setProof(json.proof_files)
      }
      setCooldown(UPLOAD_COOLDOWN_SECONDS)
      setSuccess(true)
      setFiles([])
      if (inputRef.current) {
        inputRef.current.value = ""
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message ?? "Error inesperado.")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div
        className="rounded-rounded p-5 flex flex-col gap-y-3"
        style={{
          background: "var(--brand-void-black)",
          border: "1px solid var(--brand-amethyst)",
        }}
      >
        <div className="flex items-center gap-x-2">
          <span
            className="font-heading text-lg"
            style={{ color: "var(--brand-divine-lilac)" }}
          >
            ✓ Comprobante recibido
          </span>
        </div>
        <p
          className="font-body text-sm"
          style={{ color: "var(--brand-silver-ash)" }}
        >
          Estamos verificando tu transferencia. Te avisaremos por correo apenas
          confirmemos el pago (usualmente en menos de 4 horas hábiles).
        </p>
        {proof.length > 0 && (
          <ul className="flex flex-col gap-y-1 mt-2">
            {proof.map((p, i) => (
              <li
                key={p.url || i}
                className="text-xs font-body"
                style={{ color: "var(--brand-silver-ash)" }}
              >
                Archivo {i + 1}
                {p.uploaded_at
                  ? ` subido el ${new Date(p.uploaded_at).toLocaleString(
                      "es-HN"
                    )}`
                  : ""}
              </li>
            ))}
          </ul>
        )}
        {limitReached ? (
          <p
            className="text-xs font-body mt-1"
            style={{ color: "var(--brand-silver-ash)" }}
          >
            {WHATSAPP_HELP}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setSuccess(false)}
            disabled={cooldown > 0}
            className="text-xs underline-offset-2 hover:underline self-start mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
            style={{ color: "var(--brand-divine-lilac)" }}
          >
            {cooldown > 0
              ? `Podrás subir otro archivo en ${cooldown}s`
              : `Subir otro archivo (${remaining} restante${
                  remaining === 1 ? "" : "s"
                })`}
          </button>
        )}
      </div>
    )
  }

  if (limitReached) {
    return (
      <div
        className="rounded-rounded p-5 flex flex-col gap-y-2"
        style={{
          background: "var(--brand-void-black)",
          border: "1px solid var(--brand-amethyst)",
        }}
      >
        <span
          className="font-heading text-base"
          style={{ color: "var(--brand-divine-lilac)" }}
        >
          Límite de comprobantes alcanzado
        </span>
        <p
          className="font-body text-sm"
          style={{ color: "var(--brand-silver-ash)" }}
        >
          Ya recibimos {MAX_PROOFS_PER_ORDER} archivos para este pedido.{" "}
          {WHATSAPP_HELP}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      <label
        htmlFor="bac-proof-input"
        className="cursor-pointer rounded-rounded p-6 flex flex-col items-center justify-center gap-y-2 text-center transition-colors"
        style={{
          background: "var(--brand-void-black)",
          border: "2px dashed var(--brand-amethyst)",
        }}
      >
        <span
          className="font-body text-sm"
          style={{ color: "var(--brand-ghost-white)" }}
        >
          {files.length > 0
            ? `${files.length} archivo${files.length === 1 ? "" : "s"} seleccionado${files.length === 1 ? "" : "s"}`
            : "Toca aquí o arrastra tu(s) comprobante(s)"}
        </span>
        <span
          className="font-body text-xs"
          style={{ color: "var(--brand-silver-ash)" }}
        >
          PNG, JPG, WEBP o PDF · hasta {allowedThisTurn} archivo
          {allowedThisTurn === 1 ? "" : "s"} · {MAX_FILE_SIZE_MB}MB c/u
        </span>
        <input
          id="bac-proof-input"
          ref={inputRef}
          type="file"
          accept={ACCEPTED_ATTRIBUTE}
          multiple={allowedThisTurn > 1}
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
      </label>

      {files.length > 0 && (
        <ul
          className="flex flex-col gap-y-1 px-2"
          style={{ color: "var(--brand-silver-ash)" }}
        >
          {files.map((f, i) => (
            <li key={i} className="text-xs font-body flex justify-between gap-x-3">
              <span className="truncate">{f.name}</span>
              <span className="shrink-0">
                {(f.size / 1024).toFixed(0)} KB
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p
          className="text-xs font-body"
          style={{ color: "#ff6b6b" }}
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || files.length === 0 || cooldown > 0}
        className="btn-glow w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="submit-bac-proof"
      >
        {submitting
          ? "Subiendo..."
          : cooldown > 0
          ? `Espera ${cooldown}s`
          : "Enviar comprobante"}
      </button>
    </div>
  )
}

export default BacProofUploader
