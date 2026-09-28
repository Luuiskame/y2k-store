import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ProductCard, productsByHandle } from "../../../../lib/analytics/products"
import {
  InvalidRangeError,
  describeRange,
  resolveRange,
} from "../../../../lib/analytics/time"
import { Ranked, sharedTraffic } from "../../../../lib/analytics/traffic"
import { AnalyticsRangeQuery } from "../validators"

const PRODUCT_PREFIX = "/products/"

const handleOf = (path: string): string | null =>
  path.startsWith(PRODUCT_PREFIX) ? path.slice(PRODUCT_PREFIX.length) : null

/**
 * Storefront traffic for the dashboard: sessions, visitors and the shopping
 * milestones against the comparison period, the series for the chart, and
 * where visits come from, what they look at and where they reach for WhatsApp.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let range: ReturnType<typeof resolveRange>
  try {
    range = resolveRange(req.validatedQuery as AnalyticsRangeQuery)
  } catch (error) {
    if (error instanceof InvalidRangeError) {
      return res.status(400).json({ message: error.message })
    }
    throw error
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { store, backend } = sharedTraffic()

  let report: Awaited<ReturnType<typeof store.report>>
  try {
    report = await store.report(range.current, range.previous, range.granularity)
  } catch (error) {
    logger.warn(`[analytics] traffic report failed: ${(error as Error).message}`)
    return res
      .status(503)
      .json({ message: "No se pudieron leer las visitas en este momento." })
  }

  const productPages = report.pages.filter((page) => handleOf(page.key))
  const whatsappByHandle = new Map(
    report.whatsapp_pages
      .map((page) => [handleOf(page.key), page.count] as const)
      .filter(([handle]) => handle)
  )

  const shown = [
    ...productPages.slice(0, 10),
    ...report.landing_pages,
    ...report.whatsapp_pages,
    ...report.pages.slice(0, 10),
  ]

  // The product cards only decorate the lists; without them (a database blip)
  // the dashboard still shows every figure, with paths instead of titles.
  let products = new Map<string, ProductCard>()
  try {
    products = await productsByHandle(
      req.scope.resolve(ContainerRegistrationKeys.QUERY),
      shown.map((page) => handleOf(page.key)).filter((h): h is string => !!h)
    )
  } catch (error) {
    logger.warn(`[analytics] product lookup failed: ${(error as Error).message}`)
  }

  const withProduct = (pages: Ranked[]) =>
    pages.map((page) => {
      const handle = handleOf(page.key)
      return { ...page, product: handle ? products.get(handle) ?? null : null }
    })

  return res.json({
    backend,
    range: describeRange(range),
    totals: report.totals,
    previous: report.previous,
    series: report.series,
    devices: report.devices,
    sources: report.sources,
    countries: report.countries,
    cities: report.cities,
    top_pages: withProduct(report.pages.slice(0, 10)),
    landing_pages: withProduct(report.landing_pages),
    whatsapp_pages: withProduct(report.whatsapp_pages),
    products: productPages.slice(0, 10).map((page) => {
      const handle = handleOf(page.key)!
      return {
        handle,
        views: page.count,
        whatsapp_clicks: whatsappByHandle.get(handle) ?? 0,
        product: products.get(handle) ?? null,
      }
    }),
  })
}
