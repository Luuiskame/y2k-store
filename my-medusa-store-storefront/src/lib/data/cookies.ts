import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}

// Remembers the last order placed with the BAC transfer provider so we can
// remind the customer to upload their proof from any page — the whole point is
// that they can close the browser mid-transfer and still find their way back.
const PENDING_BAC_COOKIE = "_y2k_pending_bac_order"

export const getPendingBacOrderId = async () => {
  const cookies = await nextCookies()
  return cookies.get(PENDING_BAC_COOKIE)?.value
}

export const setPendingBacOrderId = async (orderId: string) => {
  const cookies = await nextCookies()
  cookies.set(PENDING_BAC_COOKIE, orderId, {
    // The order is only reserved for 24h, but late payers still deserve the
    // reminder (and the upload form) for a few more days.
    maxAge: 60 * 60 * 24 * 5,
    httpOnly: true,
    // "lax", not "strict" like the cart: customers very often come back through
    // an Instagram/WhatsApp link, and a strict cookie isn't sent on those
    // cross-site navigations — the reminder would silently never show.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removePendingBacOrderId = async () => {
  const cookies = await nextCookies()
  cookies.set(PENDING_BAC_COOKIE, "", {
    maxAge: -1,
  })
}
