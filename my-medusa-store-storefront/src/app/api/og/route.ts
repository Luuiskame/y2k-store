import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export const runtime = "nodejs"
// The output depends on the `u` query param, so it can't be statically rendered.
// It's an immutable asset, so we lean on Cache-Control + the CDN instead.
export const dynamic = "force-dynamic"

// Only proxy/transform images from hosts we control — never an open image proxy.
const ALLOWED_HOSTS = new Set(
  [
    "media.y2kfithn.com",
    process.env.MEDUSA_CLOUD_S3_HOSTNAME,
  ].filter(Boolean) as string[]
)

/**
 * WhatsApp / Facebook / Instagram link-preview crawlers don't render WebP and
 * silently fall back to the site favicon. Medusa serves product images as WebP,
 * so a product's `og:image` (the thumbnail) never showed in WhatsApp previews.
 *
 * This route re-encodes the requested image to JPEG on the fly so crawlers get
 * a format they support. Product `generateMetadata` points `og:image` here.
 */
export async function GET(req: NextRequest) {
  const fallback = () =>
    NextResponse.redirect(new URL("/opengraph-image.png", req.nextUrl.origin))

  const src = req.nextUrl.searchParams.get("u")
  if (!src) return fallback()

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return fallback()
  }

  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return fallback()
  }

  try {
    const upstream = await fetch(url.toString(), {
      next: { revalidate: 60 * 60 * 24 }, // source asset is immutable
    })
    if (!upstream.ok) return fallback()

    const input = Buffer.from(await upstream.arrayBuffer())

    const jpeg = await sharp(input)
      .rotate() // honor EXIF orientation
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#0b0a0f" }) // dark brand bg behind any transparency
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()

    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return fallback()
  }
}
