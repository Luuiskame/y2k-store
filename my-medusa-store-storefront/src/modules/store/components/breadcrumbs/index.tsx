import { getBaseURL } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Crumb = {
  label: string
  /** Country-less path, like every LocalizedClientLink href. Omit on the current page. */
  href?: string
}

/**
 * Visible trail plus the matching BreadcrumbList, which is what lets Google
 * print "Y2K Fit › Tienda › Manga larga" instead of a bare URL.
 */
const Breadcrumbs = ({
  items,
  countryCode,
}: {
  items: Crumb[]
  countryCode: string
}) => {
  const baseUrl = getBaseURL()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href
        ? {
            item: `${baseUrl}/${countryCode}${
              item.href === "/" ? "" : item.href
            }`,
          }
        : {}),
    })),
  }

  return (
    <nav
      aria-label="Ruta de navegación"
      className="text-[11px] uppercase tracking-[0.18em] text-brand-silver-ash"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-x-2">
            {index > 0 && <span aria-hidden>/</span>}
            {item.href ? (
              <LocalizedClientLink
                href={item.href}
                className="text-brand-silver-ash hover:text-brand-divine-lilac"
              >
                {item.label}
              </LocalizedClientLink>
            ) : (
              <span aria-current="page" className="text-brand-ghost-white">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        // Names come from the admin; escaping "<" keeps one from closing the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </nav>
  )
}

export default Breadcrumbs
