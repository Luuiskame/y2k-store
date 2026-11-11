import { MagnifyingGlass, XMarkMini } from "@medusajs/icons"
import { Button, Text, clx } from "@medusajs/ui"
import type { ReactNode } from "react"

/**
 * Pieces shared by the phone lists (Pedidos, Productos, Inventario): the
 * search field, the filter pills, the placeholder cards and the footer.
 */

export const SearchField = ({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) => (
  <div className="relative">
    <MagnifyingGlass className="text-ui-fg-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
    <input
      type="search"
      inputMode="search"
      enterKeyHint="search"
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="bg-ui-bg-field shadow-borders-base placeholder:text-ui-fg-muted text-ui-fg-base focus-visible:shadow-borders-interactive-with-active h-11 w-full appearance-none rounded-xl pl-10 pr-10 outline-none transition-shadow"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Borrar búsqueda"
        className="text-ui-fg-muted hover:text-ui-fg-base absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg"
      >
        <XMarkMini />
      </button>
    )}
  </div>
)

export const Chip = ({
  on,
  onClick,
  count,
  children,
}: {
  on: boolean
  onClick: () => void
  count?: number | null
  children: ReactNode
}) => (
  <button type="button" className="y2k-chip" aria-pressed={on} onClick={onClick}>
    {children}
    {typeof count === "number" && count > 0 && (
      <span className="y2k-chip-count">{count}</span>
    )}
  </button>
)

/** A card-shaped placeholder while the first page loads. */
export const CardSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <div
    aria-hidden
    className="bg-ui-bg-base shadow-elevation-card-rest flex animate-pulse flex-col gap-3 rounded-xl p-4"
  >
    <div className="flex items-center justify-between">
      <span className="bg-ui-bg-component h-4 w-24 rounded" />
      <span className="bg-ui-bg-component h-5 w-20 rounded" />
    </div>
    {Array.from({ length: lines - 1 }, (_, i) => (
      <span
        key={i}
        className={clx("bg-ui-bg-component h-3 rounded", i % 2 ? "w-2/5" : "w-3/5")}
      />
    ))}
  </div>
)

export const EmptyState = ({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) => (
  <div className="bg-ui-bg-base shadow-elevation-card-rest flex flex-col items-center gap-1 rounded-xl px-6 py-10 text-center">
    <Text size="base" leading="compact" weight="plus">
      {title}
    </Text>
    {children && (
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {children}
      </Text>
    )}
  </div>
)

export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) => (
  <div className="bg-ui-bg-base shadow-elevation-card-rest flex flex-col items-center gap-3 rounded-xl px-6 py-8 text-center">
    <Text size="small" leading="compact" className="text-ui-fg-error">
      {message}
    </Text>
    <Button size="small" variant="secondary" onClick={onRetry}>
      Reintentar
    </Button>
  </div>
)

/** "Cargar más" and how far the list has got. */
export const ListFooter = ({
  shown,
  total,
  noun,
  hasMore,
  loading,
  onMore,
}: {
  shown: number
  total: number
  /** [singular, plural] */
  noun: [string, string]
  hasMore: boolean
  loading: boolean
  onMore: () => void
}) => (
  <div className="flex flex-col items-center gap-2 py-1">
    {hasMore && (
      <Button
        variant="secondary"
        className="h-11 w-full rounded-xl"
        onClick={onMore}
        isLoading={loading}
        disabled={loading}
      >
        Cargar más
      </Button>
    )}
    <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
      {shown} de {total} {total === 1 ? noun[0] : noun[1]}
    </Text>
  </div>
)
