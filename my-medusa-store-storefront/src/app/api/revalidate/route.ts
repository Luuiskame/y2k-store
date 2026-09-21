import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Purga la caché del catálogo a demanda: la usas cuando acabas de subir
 * inventario y quieres verlo ya, sin esperar los 10 minutos de
 * `CATALOG_REVALIDATE_SECONDS` y sin desplegar dos veces para encender y apagar
 * `CATALOG_FRESH`.
 *
 *   curl -X POST https://y2kfithn.com/api/revalidate \
 *        -H "x-revalidate-secret: $REVALIDATE_SECRET"
 *
 * Falla cerrada a propósito. Sin `REVALIDATE_SECRET` configurado la ruta
 * responde 404 en vez de quedar abierta: un endpoint público que vacía la caché
 * es una palanca de ataque — cada llamada devuelve la tienda al estado de "cada
 * visita pega al backend", que es exactamente lo que la caché vino a evitar.
 */
const secretMatches = (provided: string | null): boolean => {
  const expected = process.env.REVALIDATE_SECRET

  if (!expected || !provided) {
    return false
  }

  // Digests, para que `timingSafeEqual` reciba siempre dos buffers de 32 bytes:
  // lanza si las longitudes no coinciden, y comprobar la longitud del valor
  // crudo filtraría el tamaño del secreto.
  const digest = (value: string): Uint8Array =>
    new Uint8Array(crypto.createHash("sha256").update(value).digest())

  try {
    return crypto.timingSafeEqual(digest(provided), digest(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.REVALIDATE_SECRET) {
    return new NextResponse(null, { status: 404 })
  }

  if (!secretMatches(req.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 })
  }

  // El martillo grande: invalida todo lo que cuelga de la raíz. Es lo que se
  // quiere tras un drop de inventario — los precios, el stock y los rails de
  // productos cambian a la vez en toda la tienda, no en una ruta suelta.
  revalidatePath("/", "layout")

  return NextResponse.json({ revalidated: true, at: new Date().toISOString() })
}
