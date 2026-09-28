import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

/**
 * What the footer, the sitemap and `generateStaticParams` read: names, handles
 * and the tree. This default used to include `*products` — every product of
 * the catalog pulled again, per category, to render links — and nothing reads
 * `category.products`. Pass `fields` per call if a page needs more.
 */
const CATEGORY_LIST_FIELDS =
  "id,name,handle,rank,parent_category_id,*category_children"

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCacheOptions("categories")),
    revalidate: 1800,
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields: CATEGORY_LIST_FIELDS,
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
    revalidate: 1800,
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          // Added to Medusa's defaults, which already bring the parent for the
          // breadcrumbs. The category page never reads `products`: its grid
          // comes from the shared catalog list.
          fields: "*category_children",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
