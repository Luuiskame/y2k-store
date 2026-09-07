/**
 * El checkout pide un solo campo "Nombre completo", pero Medusa guarda
 * `first_name` y `last_name` por separado. La primera palabra es el nombre y
 * el resto los apellidos.
 */
export function splitFullName(fullName: string): {
  first_name: string
  last_name: string
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)

  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" "),
  }
}

export function joinFullName(
  firstName?: string | null,
  lastName?: string | null
): string {
  return [firstName, lastName].filter(Boolean).join(" ")
}
