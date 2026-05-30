"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

type ProofFile = { url: string; uploaded_at: string }

type Props = {
  orderId: string
  initialProof: ProofFile[]
  hasUploaded: boolean
}

const MAX_FILES = 3
const MAX_SIZE_MB = 8
const ACCEPTED = "image/png,image/jpeg,image/webp,application/pdf"

const BacProofUploader = ({ orderId, initialProof, hasUploaded }: Props) => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(hasUploaded)

  const onPick = (picked: FileList | null) => {
    setError(null)
    if (!picked) return
    const arr = Array.from(picked).slice(0, MAX_FILES)
    const tooBig = arr.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (tooBig) {
      setError(`Cada archivo debe pesar menos de ${MAX_SIZE_MB}MB.`)
      return
    }
    setFiles(arr)
  }

  const onSubmit = async () => {
    if (files.length === 0) {
      setError("Selecciona al menos un archivo.")
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
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? "No pudimos subir el comprobante.")
      }
      setSuccess(true)
      setFiles([])
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
        {initialProof.length > 0 && (
          <ul className="flex flex-col gap-y-1 mt-2">
            {initialProof.map((p, i) => (
              <li
                key={p.url}
                className="text-xs font-body"
                style={{ color: "var(--brand-silver-ash)" }}
              >
                Archivo {i + 1} subido el{" "}
                {new Date(p.uploaded_at).toLocaleString("es-HN")}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="text-xs underline-offset-2 hover:underline self-start mt-1"
          style={{ color: "var(--brand-divine-lilac)" }}
        >
          Subir otro archivo
        </button>
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
          PNG, JPG, WEBP o PDF · hasta {MAX_FILES} archivos · {MAX_SIZE_MB}MB c/u
        </span>
        <input
          id="bac-proof-input"
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
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
        disabled={submitting || files.length === 0}
        className="btn-glow w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="submit-bac-proof"
      >
        {submitting ? "Subiendo..." : "Enviar comprobante"}
      </button>
    </div>
  )
}

export default BacProofUploader
