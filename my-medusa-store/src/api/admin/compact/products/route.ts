import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  QueryContext,
  getVariantAvailability,
} from "@medusajs/framework/utils"

import { toCompactProduct } from "../../../../lib/compact"
import type { CompactProductsQuery } from "../validators"

const DEFAULT_LIMIT = 12

/** The country the store sells to; prices are the ones of its region. */
const HOME_COUNTRY = "hn"

/**
 * Products with what the storefront shows for each variant: the price a
 * customer in Honduras pays (price lists and sales included) and how many
 * can still be sold from the store's sales channel. Plus, for the stock
 * screen, where each variant's units are kept.
 *
 * The admin's own product list has neither: its prices are the raw price
 * rows and its stock is not per sales channel. Used by "Nuevo pedido" to
 * pick products, and by the phone views of Productos and Inventario.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { q, status, limit, offset } = req.validatedQuery as CompactProductsQuery
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const [{ data: regions }, { data: stores }] = await Promise.all([
    query.graph({
      entity: "region",
      fields: ["id", "currency_code", "countries.iso_2"],
    }),
    query.graph({ entity: "store", fields: ["id", "default_sales_channel_id"] }),
  ])

  const region =
    (regions as any[]).find((candidate) =>
      (candidate.countries ?? []).some(
        (country: any) => country?.iso_2 === HOME_COUNTRY
      )
    ) ?? (regions as any[])[0]

  if (!region) {
    return res.json({ products: [], count: 0, currency_code: null })
  }

  const search = (q ?? "").trim()

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "thumbnail",
      "status",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.variant_rank",
      "variants.manage_inventory",
      "variants.allow_backorder",
      "variants.calculated_price.*",
      "variants.inventory_items.inventory_item_id",
      "variants.inventory_items.required_quantity",
      "variants.inventory_items.inventory.id",
      "variants.inventory_items.inventory.location_levels.location_id",
      "variants.inventory_items.inventory.location_levels.stocked_quantity",
      "variants.inventory_items.inventory.location_levels.reserved_quantity",
    ],
    filters: {
      ...(status === "all" ? {} : { status: "published" }),
      ...(search ? { q: search } : {}),
    } as any,
    pagination: {
      take: limit ?? DEFAULT_LIMIT,
      skip: offset ?? 0,
      order: { created_at: "DESC" },
    },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: region.id,
          currency_code: region.currency_code,
        }),
      },
    },
  })

  const salesChannelId = (stores[0] as any)?.default_sales_channel_id
  const variantIds = (products as any[]).flatMap((product) =>
    (product.variants ?? []).map((variant: any) => variant.id)
  )

  // Without a default sales channel there is nothing to count against; an
  // order is still checked for stock when its cart is built.
  const availability =
    salesChannelId && variantIds.length
      ? await getVariantAvailability(query, {
          variant_ids: variantIds,
          sales_channel_id: salesChannelId,
        })
      : {}

  res.json({
    currency_code: region.currency_code,
    count: metadata?.count ?? products.length,
    products: (products as any[]).map((product) =>
      toCompactProduct(product, availability)
    ),
  })
}
