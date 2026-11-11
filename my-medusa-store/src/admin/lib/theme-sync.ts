import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"

import {
  getThemePrefs,
  hasLocalTheme,
  setThemePrefs,
  subscribeTheme,
} from "../theme/boot"
import { ThemePrefs, hasPrefs, parsePrefs, samePrefs } from "../theme/prefs"
import { sdk } from "./client"

/**
 * Keeps the look in step with the account.
 *
 * The browser's own copy (localStorage, applied by theme/boot.ts before the
 * first paint) is a cache; the account's copy (`/admin/appearance`) is the
 * one that travels: a new phone starts from it, and a change made on the
 * computer reaches the phone the next time the app opens there.
 *
 * A change that could not be saved (offline, a failed request) is flagged in
 * the browser, so the next load sends it again instead of letting the older
 * look in the account overwrite it.
 */

const APPEARANCE_KEY = ["y2k-appearance"]
const UNSAVED_KEY = "y2k-admin-theme-unsaved"
const SAVE_DELAY_MS = 600

const readUnsaved = (): boolean => {
  try {
    return localStorage.getItem(UNSAVED_KEY) === "1"
  } catch {
    return false
  }
}

const markUnsaved = (unsaved: boolean) => {
  try {
    if (unsaved) {
      localStorage.setItem(UNSAVED_KEY, "1")
    } else {
      localStorage.removeItem(UNSAVED_KEY)
    }
  } catch {
    // Storage blocked: nothing to remember it in.
  }
}

const save = (prefs: ThemePrefs) =>
  sdk.client.fetch<{ appearance: unknown }>("/admin/appearance", {
    method: "POST",
    body: prefs,
  })

/** The look currently applied, re-rendering when it changes. */
export const useThemePrefs = (): ThemePrefs =>
  useSyncExternalStore(subscribeTheme, getThemePrefs, getThemePrefs)

/**
 * Brings the account's look to this browser, once per visit. Mounted by the
 * pages the app opens on (the orders list, Estadísticas, Apariencia).
 */
export const useAccountTheme = () => {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: APPEARANCE_KEY,
    queryFn: () => sdk.client.fetch<{ appearance: unknown }>("/admin/appearance"),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    if (!data) {
      return
    }
    const local = getThemePrefs()

    // A change made here that never reached the account: send it now.
    if (readUnsaved()) {
      save(local)
        .then(() => {
          markUnsaved(false)
          queryClient.setQueryData(APPEARANCE_KEY, { appearance: local })
        })
        .catch(() => undefined)
      return
    }

    if (!hasPrefs(data.appearance)) {
      return
    }
    const account = parsePrefs(data.appearance)
    if (!hasLocalTheme() || !samePrefs(account, local)) {
      setThemePrefs(account)
    }
  }, [data, queryClient])
}

/**
 * Changes the look: at once in this browser, and a moment later in the
 * account (one request for a burst of taps through the palettes).
 */
export const useChangeTheme = () => {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mutation = useMutation({
    mutationFn: save,
    onSuccess: (_result, prefs) => {
      // Only the latest change clears the flag; an older answer arriving
      // late must not hide that a newer one is still on its way.
      if (samePrefs(prefs, getThemePrefs())) {
        markUnsaved(false)
      }
      queryClient.setQueryData(APPEARANCE_KEY, { appearance: prefs })
    },
  })
  const { mutate } = mutation

  useEffect(
    () => () => {
      // Leaving the page with a save still waiting: send it now.
      if (timer.current) {
        clearTimeout(timer.current)
        mutate(getThemePrefs())
      }
    },
    [mutate]
  )

  const change = useCallback(
    (patch: Partial<ThemePrefs>) => {
      setThemePrefs(patch)
      markUnsaved(true)
      if (timer.current) {
        clearTimeout(timer.current)
      }
      timer.current = setTimeout(() => {
        timer.current = null
        mutate(getThemePrefs())
      }, SAVE_DELAY_MS)
    },
    [mutate]
  )

  return { change, saving: mutation.isPending, failed: mutation.isError }
}
