import { useEffect, useState } from "react"

/** A value that only changes once it has stopped changing for `ms`. */
export const useDebounced = <T,>(value: T, ms = 300): T => {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  return settled
}

/** A choice remembered per browser; a blocked storage just forgets it. */
export const readStored = <T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T
): T => {
  try {
    const stored = localStorage.getItem(key)
    return allowed.includes(stored as T) ? (stored as T) : fallback
  } catch {
    return fallback
  }
}

export const writeStored = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked: the choice is not remembered.
  }
}
