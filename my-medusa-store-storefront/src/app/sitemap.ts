import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { listRegions } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"

const STATIC_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/store", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/sobre-nosotros", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/envios", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/preguntas-frecuentes", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/guia-de-tallas", priority: 0.6, changeFrequency: "monthly" as const },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL()
  const now = new Date()

  let countryCodes: string[] = []
  try {
    const regions = await listRegions()
    countryCodes =
      (regions
        ?.flatMap((r) => r.countries?.map((c) => c.iso_2))
        .filter(Boolean) as string[]) || []
  } catch {
    countryCodes = ["hn"]
  }

  if (countryCodes.length === 0) countryCodes = ["hn"]

  const entries: MetadataRoute.Sitemap = []

  for (const cc of countryCodes) {
    for (const sp of STATIC_PATHS) {
      entries.push({
        url: `${baseUrl}/${cc}${sp.path}`,
        lastModified: now,
        changeFrequency: sp.changeFrequency,
        priority: sp.priority,
      })
    }
  }

  try {
    const [{ collections }, categories] = await Promise.all([
      listCollections({ fields: "id, handle, title" }),
      listCategories(),
    ])

    for (const cc of countryCodes) {
      for (const c of collections || []) {
        if (!c.handle) continue
        entries.push({
          url: `${baseUrl}/${cc}/collections/${c.handle}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }
      for (const cat of categories || []) {
        if (!cat.handle) continue
        entries.push({
          url: `${baseUrl}/${cc}/categories/${cat.handle}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }
    }
  } catch (e) {
    console.error("sitemap: failed listing collections/categories", e)
  }

  try {
    for (const cc of countryCodes) {
      const { response } = await listProducts({
        countryCode: cc,
        queryParams: { limit: 100, fields: "handle,updated_at" },
      })
      for (const p of response.products) {
        if (!p.handle) continue
        entries.push({
          url: `${baseUrl}/${cc}/products/${p.handle}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.7,
        })
      }
    }
  } catch (e) {
    console.error("sitemap: failed listing products", e)
  }

  return entries
}
