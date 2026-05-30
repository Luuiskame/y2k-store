import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Container, Heading, Button, Badge, Text, toast } from "@medusajs/ui"
import { useState } from "react"

type ProofFile = { url: string; uploaded_at: string }

const BacProofWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const proof = ((order.metadata?.bac_transfer_proof ?? []) as ProofFile[]) || []
  const status =
    (order.metadata?.bac_transfer_status as string | undefined) ?? null

  const providerId =
    (order as any).payment_collections?.[0]?.payments?.[0]?.provider_id ??
    (order as any).payment_collections?.[0]?.payment_sessions?.[0]?.provider_id
  const isBac = providerId?.startsWith("pp_transferencia-bac")

  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(status === "verified")

  if (!isBac && proof.length === 0) {
    return null
  }

  const onConfirm = async () => {
    setConfirming(true)
    try {
      const res = await fetch(`/admin/orders/${order.id}/bac-confirm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message ?? "No se pudo confirmar el pago.")
      }
      setConfirmed(true)
      toast.success("Pago confirmado. Notificando al cliente.")
    } catch (e: any) {
      toast.error(e.message ?? "Error al confirmar el pago.")
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Heading level="h2">Transferencia BAC</Heading>
          {confirmed ? (
            <Badge color="green">Pago verificado</Badge>
          ) : status === "proof_uploaded" ? (
            <Badge color="orange">Comprobante pendiente</Badge>
          ) : (
            <Badge color="grey">Sin comprobante</Badge>
          )}
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col gap-y-4">
        {proof.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            Aún no se ha subido comprobante de transferencia.
          </Text>
        ) : (
          <div className="flex flex-col gap-y-3">
            <Text size="small" className="text-ui-fg-subtle">
              {proof.length} archivo{proof.length === 1 ? "" : "s"} recibido
              {proof.length === 1 ? "" : "s"}
            </Text>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {proof.map((p, i) => {
                const isPdf = p.url.toLowerCase().endsWith(".pdf")
                return (
                  <a
                    key={p.url}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border rounded-md overflow-hidden hover:border-ui-border-interactive transition-colors"
                  >
                    {isPdf ? (
                      <div className="flex items-center justify-center h-32 bg-ui-bg-subtle">
                        <Text size="small">📄 PDF</Text>
                      </div>
                    ) : (
                      <img
                        src={p.url}
                        alt={`Comprobante ${i + 1}`}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="px-2 py-1.5">
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {new Date(p.uploaded_at).toLocaleString("es-HN")}
                      </Text>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {proof.length > 0 && !confirmed && (
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={confirming}
            disabled={confirming}
          >
            Confirmar pago
          </Button>
        )}

        {confirmed && (
          <Text size="small" className="text-ui-fg-subtle">
            El cliente ya fue notificado por correo.
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
