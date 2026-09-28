import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ProductCard, productsByHandle } from "../../../../lib/analytics/products"
import {
  LIVE_WINDOW_MS,
  RECENT_WINDOW_MS,
  sharedTraffic,
} from "../../../../lib/analytics/traffic"

/**
 * Who is on the storefront right now. The dashboard polls this every few
 * seconds, so it reads Redis only; product titles come from a per-process
 * cache that stops hitting Postgres once it has seen the catalog.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { store, backend } = sharedTraffic()

  let snapshot: Awaited<ReturnType<typeof store.live>>
  try {
    snapshot = await store.live()
  } catch (error) {
    logger.warn(`[analytics] live snapshot failed: ${(error as Error).message}`)
    return res
      .status(503)
      .json({ message: "No se pudo leer quién está en la tienda." })
  }

  let products = new Map<string, ProductCard>()
  try {
    products = await productsByHandle(
      req.scope.resolve(ContainerRegistrationKeys.QUERY),
      snapshot.visitors.map((v) => v.handle).filter((h): h is string => !!h)
    )
  } catch (error) {
    logger.warn(`[analytics] product lookup failed: ${(error as Error).message}`)
  }

  return res.json({
    backend,
    window_seconds: LIVE_WINDOW_MS / 1000,
    recent_window_minutes: RECENT_WINDOW_MS / 60_000,
    active: snapshot.active,
    recent: snapshot.recent,
    today: snapshot.today,
    visitors: snapshot.visitors.map((visitor) => ({
      ...visitor,
      product: visitor.handle ? products.get(visitor.handle) ?? null : null,
    })),
    generated_at: Date.now(),
    // For the "no contar mis visitas" link the dashboard shows.
    storefront_url: process.env.STOREFRONT_URL ?? null,
  })
}
