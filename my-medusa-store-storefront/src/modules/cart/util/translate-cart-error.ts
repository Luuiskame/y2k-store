export type FriendlyCartError = {
  message: string
  reason: "inventory" | "not-found" | "generic"
}

export function translateCartError(raw?: string | null): FriendlyCartError | null {
  if (!raw) return null

  const text = raw.toLowerCase()

  if (
    text.includes("required inventory") ||
    text.includes("not enough inventory") ||
    text.includes("insufficient inventory") ||
    text.includes("out of stock")
  ) {
    return {
      message: "No tenemos más unidades disponibles de esta talla por ahora.",
      reason: "inventory",
    }
  }

  if (text.includes("not found") || text.includes("does not exist")) {
    return {
      message: "Este producto ya no está disponible. Recarga la página.",
      reason: "not-found",
    }
  }

  return {
    message: "No pudimos actualizar el carrito. Inténtalo de nuevo.",
    reason: "generic",
  }
}
