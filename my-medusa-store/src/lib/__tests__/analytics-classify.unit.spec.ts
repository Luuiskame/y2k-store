import {
  classifyDevice,
  classifySource,
  isBot,
  normalizeCity,
  normalizeCountry,
  normalizePage,
} from "../analytics/classify"

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
const ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 14; SM-A146M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
const CUBOT =
  "Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
const INSTAGRAM_APP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 339.0.3.12.91 (iPhone14,5; iOS 17_5; es_HN)"
const FACEBOOK_APP =
  "Mozilla/5.0 (Linux; Android 14; SM-A146M Build/UP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]"
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"

describe("normalizePage", () => {
  it("drops the country prefix and the query string", () => {
    expect(normalizePage("/hn")).toEqual({ path: "/", type: "home", handle: null })
    expect(normalizePage("/hn/products/camiseta-cruz?talla=m")).toEqual({
      path: "/products/camiseta-cruz",
      type: "product",
      handle: "camiseta-cruz",
    })
    expect(normalizePage("/hn/checkout?step=payment").path).toBe("/checkout")
  })

  it("masks order ids and transfer tokens", () => {
    expect(normalizePage("/hn/order/order_01J8ZK/confirmed")).toEqual({
      path: "/order/:id/confirmed",
      type: "purchase",
      handle: null,
    })
    expect(normalizePage("/hn/order/order_01J8ZK/transferencia-bac").path).toBe(
      "/order/:id/transferencia-bac"
    )
    expect(normalizePage("/hn/order/order_01J8ZK/transfer/tok_secret/accept").path).toBe(
      "/order/:id"
    )
    expect(normalizePage("/hn/account/orders/details/order_01J8ZK").path).toBe(
      "/account/orders/details/:id"
    )
    expect(normalizePage("/hn/reset-password?token=abc.def").path).toBe("/reset-password")
  })

  it("classifies the storefront's pages", () => {
    expect(normalizePage("/hn/store").type).toBe("catalog")
    expect(normalizePage("/hn/categories/hombre/camisetas").type).toBe("category")
    expect(normalizePage("/hn/collections/drop-001").type).toBe("collection")
    expect(normalizePage("/hn/cart").type).toBe("cart")
    expect(normalizePage("/hn/envios").type).toBe("info")
    expect(normalizePage("/hn/account").type).toBe("account")
  })

  it("lowercases so one page is one key", () => {
    expect(normalizePage("/HN/Products/Camiseta-Cruz").handle).toBe("camiseta-cruz")
  })

  it("files anything unexpected under one bucket", () => {
    expect(normalizePage("/hn/<script>alert(1)</script>").path).toBe("/otra")
    expect(normalizePage("/a/b/c/d/e/f").path).toBe("/otra")
    expect(normalizePage("https://evil.example/")).toEqual(normalizePage(undefined))
    expect(normalizePage(42).path).toBe("/otra")
  })
})

describe("classifySource", () => {
  it("trusts utm_source first, matched loosely", () => {
    expect(classifySource({ utmSource: "ig_web_copy_link" })).toBe("instagram")
    expect(classifySource({ utmSource: "Facebook" })).toBe("facebook")
    expect(classifySource({ utmSource: "volante-tienda" })).toBe("otro")
  })

  it("recognises the in-app browsers that send no referrer", () => {
    expect(classifySource({ userAgent: INSTAGRAM_APP })).toBe("instagram")
    expect(classifySource({ userAgent: FACEBOOK_APP })).toBe("facebook")
  })

  it("reads click ids and share parameters", () => {
    expect(classifySource({ clickId: "igsh" })).toBe("instagram")
    expect(classifySource({ clickId: "gclid" })).toBe("google")
    expect(classifySource({ clickId: "fbclid" })).toBe("meta")
    expect(
      classifySource({ clickId: "fbclid", referrer: "https://l.instagram.com/" })
    ).toBe("instagram")
  })

  it("falls back to the referrer's host", () => {
    expect(classifySource({ referrer: "https://www.google.com/" })).toBe("google")
    expect(classifySource({ referrer: "https://www.google.hn/" })).toBe("google")
    expect(
      classifySource({
        referrer: "android-app://com.google.android.googlequicksearchbox/",
      })
    ).toBe("google")
    expect(classifySource({ referrer: "https://lm.facebook.com/" })).toBe("facebook")
    expect(classifySource({ referrer: "https://t.co/abc" })).toBe("x")
    expect(classifySource({ referrer: "https://blog.example.com/post" })).toBe("otro")
  })

  it("calls a visit with nothing to go on direct", () => {
    expect(classifySource({})).toBe("directo")
    expect(classifySource({ referrer: "" })).toBe("directo")
    expect(classifySource({ referrer: "not a url" })).toBe("directo")
  })
})

describe("classifyDevice", () => {
  it("tells phones, tablets and computers apart", () => {
    expect(classifyDevice(IPHONE)).toBe("mobile")
    expect(classifyDevice(ANDROID_PHONE)).toBe("mobile")
    expect(classifyDevice(ANDROID_TABLET)).toBe("tablet")
    expect(classifyDevice(WINDOWS)).toBe("desktop")
    expect(classifyDevice(undefined)).toBe("desktop")
  })
})

describe("isBot", () => {
  it("catches crawlers, preview fetchers and scripts", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true)
    expect(isBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true)
    expect(isBot("WhatsApp/2.23.20.0 A")).toBe(true)
    expect(isBot("Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)")).toBe(true)
    expect(isBot("curl/8.4.0")).toBe(true)
    expect(isBot("")).toBe(true)
    expect(isBot(undefined)).toBe(true)
  })

  it("lets real browsers through, CUBOT phones included", () => {
    expect(isBot(IPHONE)).toBe(false)
    expect(isBot(ANDROID_PHONE)).toBe(false)
    expect(isBot(CUBOT)).toBe(false)
    expect(isBot(INSTAGRAM_APP)).toBe(false)
    expect(isBot(FACEBOOK_APP)).toBe(false)
  })
})

describe("geolocation", () => {
  it("accepts ISO country codes only", () => {
    expect(normalizeCountry("HN")).toBe("HN")
    expect(normalizeCountry("hn")).toBeNull()
    expect(normalizeCountry("HND")).toBeNull()
  })

  it("accepts city names, accents included, and nothing else", () => {
    expect(normalizeCity("San Pedro Sula")).toBe("San Pedro Sula")
    expect(normalizeCity("  Comayagüela ")).toBe("Comayagüela")
    expect(normalizeCity("<b>x</b>")).toBeNull()
    expect(normalizeCity("")).toBeNull()
    expect(normalizeCity(3)).toBeNull()
  })
})
