import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Container, Heading, Button, Badge, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

import { LANG_HEADER, dateLocale, getLang } from "../i18n/lang"
import { tr } from "../i18n/tr"
import { useLang, useT } from "../i18n/use-t"

/** What `GET /admin/orders/:id/bac-proofs` returns per file. */
type SignedProof = { url: string | null; uploaded_at: string; is_pdf: boolean }

// Orders uploaded before the per-order cap existed can hold hundreds of files.
// Render a page at a time so opening one of those does not fire hundreds of
// image requests and lock up the admin.
const PREVIEW_PAGE_SIZE = 12

const BacProofWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const words = useT().alerts.bac
  const locale = dateLocale(useLang())
  const stored = order.metadata?.bac_transfer_proof
  const proofCount = Array.isArray(stored) ? stored.length : 0
  const status =
    (order.metadata?.bac_transfer_status as string | undefined) ?? null

  const providerId =
    (order as any).payment_collections?.[0]?.payments?.[0]?.provider_id ??
    (order as any).payment_collections?.[0]?.payment_sessions?.[0]?.provider_id
  const isBac = providerId?.startsWith("pp_transferencia-bac")

  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(status === "verified")
  const [visibleCount, setVisibleCount] = useState(PREVIEW_PAGE_SIZE)

  // Receipts are private: the metadata only says where they are, and the
  // backend hands out signed URLs that expire after an hour. Reloading the
  // page gets fresh ones.
  const [proof, setProof] = useState<SignedProof[] | null>(null)
  const [proofError, setProofError] = useState<string | null>(null)

  useEffect(() => {
    if (proofCount === 0) {
      return
    }

    let cancelled = false
    fetch(`/admin/orders/${order.id}/bac-proofs`, {
      credentials: "include",
      headers: { [LANG_HEADER]: getLang() },
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json.message ?? tr().alerts.bac.proofsFailed)
        }
        if (!cancelled) {
          setProof(json.proofs ?? [])
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setProofError(e.message ?? tr().alerts.bac.proofsFailed)
        }
      })

    return () => {
      cancelled = true
    }
  }, [order.id, proofCount])

  if (!isBac && proofCount === 0) {
    return null
  }

  const onConfirm = async () => {
    setConfirming(true)
    try {
      const res = await fetch(`/admin/orders/${order.id}/bac-confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", [LANG_HEADER]: getLang() },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? words.confirmFailed)
      }
      setConfirmed(true)
      toast.success(words.confirmed)
    } catch (e: any) {
      toast.error(e.message ?? words.confirmError)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Heading level="h2">{words.title}</Heading>
          {confirmed ? (
            <Badge color="green">{words.verified}</Badge>
          ) : status === "proof_uploaded" ? (
            <Badge color="orange">{words.proofPending}</Badge>
          ) : (
            <Badge color="grey">{words.noProof}</Badge>
          )}
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col gap-y-4">
        {proofCount === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            {words.nothingUploaded}
          </Text>
        ) : (
          <div className="flex flex-col gap-y-3">
            <Text size="small" className="text-ui-fg-subtle">
              {words.filesReceived(proofCount)}
            </Text>
            {proofError ? (
              <Text size="small" className="text-ui-fg-error">
                {proofError}
              </Text>
            ) : !proof ? (
              <Text size="small" className="text-ui-fg-subtle">
                {words.loadingProofs}
              </Text>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {proof.slice(0, visibleCount).map((p, i) =>
                  p.url ? (
                    <a
                      key={i}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border rounded-md overflow-hidden hover:border-ui-border-interactive transition-colors"
                    >
                      {p.is_pdf ? (
                        <div className="flex items-center justify-center h-32 bg-ui-bg-subtle">
                          <Text size="small">📄 PDF</Text>
                        </div>
                      ) : (
                        <img
                          src={p.url}
                          alt={words.proofAlt(i + 1)}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="px-2 py-1.5">
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {new Date(p.uploaded_at).toLocaleString(locale)}
                        </Text>
                      </div>
                    </a>
                  ) : (
                    <div
                      key={i}
                      className="flex items-center justify-center h-32 border rounded-md bg-ui-bg-subtle px-2 text-center"
                    >
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {words.fileMissing(i + 1)}
                      </Text>
                    </div>
                  )
                )}
              </div>
            )}
            {proof && proof.length > visibleCount && (
              <Button
                variant="secondary"
                size="small"
                className="self-start"
                onClick={() => setVisibleCount((c) => c + PREVIEW_PAGE_SIZE)}
              >
                {words.showMore(
                  Math.min(PREVIEW_PAGE_SIZE, proof.length - visibleCount),
                  proof.length - visibleCount
                )}
              </Button>
            )}
          </div>
        )}

        {proofCount > 0 && !confirmed && (
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={confirming}
            disabled={confirming}
          >
            {words.confirm}
          </Button>
        )}

        {confirmed && (
          <Text size="small" className="text-ui-fg-subtle">
            {words.customerNotified}
          </Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default BacProofWidget
