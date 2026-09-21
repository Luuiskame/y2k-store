"use server"

export type Locale = {
  code: string
  name: string
}

/**
 * Los idiomas disponibles. Hoy siempre `null`: **la ruta `/store/locales` no
 * existe en el backend.** `my-medusa-store/src/api/store/` sólo tiene `custom`,
 * `orders` y `social-proof`.
 *
 * Esto antes hacía el fetch igualmente. El SDK lanza con 404, el
 * `.catch(() => null)` se lo tragaba y el resultado era exactamente el mismo
 * `null` que ahora — pero costaba una ida y vuelta a Railway **por cada vista
 * de página**, desde el `Nav`, que está en el layout de toda la tienda. Y no
 * había forma de cachearla: pedía `revalidate: 3600`, pero una petición que
 * lanza nunca entra en la caché de datos de Next, así que fallaba y volvía a
 * fallar indefinidamente.
 *
 * Medido contra producción el 2026-09-21: una `/store/locales` → 404 por cada
 * recarga de la home, para siempre.
 *
 * Si algún día se implementa la ruta, restaurar el fetch aquí. Los consumidores
 * (`Nav` y `SideMenu`) ya tratan `null` y `Locale[]` por igual — `SideMenu`
 * guarda con `!!locales?.length` — así que no hay nada más que tocar.
 */
export const listLocales = async (): Promise<Locale[] | null> => {
  return null
}
