import { Spinner } from "@medusajs/icons"
import { Container, Heading, Text, clx } from "@medusajs/ui"
import type { ReactNode } from "react"

/** A dashboard card: heading row, then content. */
export const Section = ({
  title,
  description,
  actions,
  dimmed = false,
  children,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Previous numbers kept on screen while new ones load. */
  dimmed?: boolean
  children: ReactNode
}) => (
  <Container className="divide-y p-0">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
      <div className="flex flex-col gap-y-1">
        <Heading level="h2">{title}</Heading>
        {description && (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {description}
          </Text>
        )}
      </div>
      {actions}
    </div>
    <div className={clx("px-6 py-4 transition-opacity", dimmed && "opacity-60")}>
      {children}
    </div>
  </Container>
)

export const Loading = () => (
  <div className="flex items-center justify-center py-10">
    <Spinner className="animate-spin text-ui-fg-muted" />
  </div>
)

export const ErrorNote = ({ error }: { error: unknown }) => (
  <Text size="small" leading="compact" className="text-ui-fg-error">
    {error instanceof Error && error.message
      ? error.message
      : "No se pudieron cargar estos datos."}
  </Text>
)

export const Empty = ({ children }: { children: ReactNode }) => (
  <Text size="small" leading="compact" className="text-ui-fg-subtle">
    {children}
  </Text>
)
