import "server-only"

/**
 * Política de caché del catálogo.
 *
 * El catálogo (productos y variantes) es el único dato de la tienda que es a la
 * vez público, idéntico para todos los visitantes y caro de pedir: `listProducts`
 * se llama desde seis sitios distintos y una sola vista de producto dispara
 * varias. Sin caché, cada visita —de una persona o de un bot— pega al backend.
 * Eso es lo que obligó a dejar encendido el Attack Challenge Mode de Vercel.
 *
 * El resto de datos NO pasa por aquí, a propósito:
 *   - carrito, cliente, pedidos, envíos → por visitante, ya van con `tags`
 *   - `payment.ts` y `bac-transfer.ts` → `no-store` es CORRECTO, son datos de
 *     checkout y servir uno cacheado sería un error de dinero, no de latencia
 */

/** Cuánto vive una respuesta del catálogo antes de revalidarse. */
export const CATALOG_REVALIDATE_SECONDS = 600

/**
 * Interruptor para cuando entra inventario nuevo y quieres ver los cambios sin
 * esperar los 10 minutos. `CATALOG_FRESH=1` en Vercel → el catálogo deja de
 * cachearse por completo.
 *
 * Es la salida de emergencia, no el modo normal. Dos avisos:
 *
 * 1. **Con esto encendido la tienda vuelve a estar como el día del incidente**:
 *    cada visita pega al backend. Enciéndelo mientras subes, apágalo al acabar.
 * 2. En Vercel una variable de entorno **no llega hasta el siguiente deploy**,
 *    así que encenderlo y apagarlo cuesta dos despliegues. Para un cambio
 *    puntual sale más barato `POST /api/revalidate` (ver esa ruta), que es
 *    inmediato y no toca la caché del resto del catálogo.
 */
export const CATALOG_FRESH = process.env.CATALOG_FRESH === "1"

if (CATALOG_FRESH) {
  // Una tienda sin caché se ve exactamente igual que una con caché hasta que
  // llega el flood. Que quede dicho en los logs de Vercel, porque el estado
  // peligroso es el silencioso: basta olvidarse de apagarlo tras subir stock.
  console.warn(
    "[cache] CATALOG_FRESH=1 — el catálogo NO se está cacheando. Cada visita pega al backend. Esto es el modo de subir inventario, no el modo normal: quítala en cuanto acabes."
  )
}

type CatalogFetchOptions =
  | { cache: "no-store" }
  | { next: { revalidate: number; tags?: string[] } }

/**
 * Lo que hay que pasarle a `sdk.client.fetch` para una llamada de catálogo.
 *
 * Devuelve `cache` o `next`, nunca los dos. Ese fue exactamente el bug: en
 * `products.ts` convivían `next: { revalidate: 600 }` y `cache: "no-cache"`, y
 * en Next 15 gana `cache` — el `revalidate` llevaba meses sin hacer nada.
 */
export const catalogFetchOptions = (
  cacheOptions: { tags?: string[] } = {}
): CatalogFetchOptions =>
  CATALOG_FRESH
    ? { cache: "no-store" }
    : { next: { revalidate: CATALOG_REVALIDATE_SECONDS, ...cacheOptions } }
