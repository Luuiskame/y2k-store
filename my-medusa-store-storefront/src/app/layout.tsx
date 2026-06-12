import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Cinzel, Inter, UnifrakturMaguntia } from "next/font/google"
import "styles/globals.css"

const unifraktur = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-unifraktur",
  display: "swap",
})

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-cinzel",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default:
      "Y2K Fit Honduras | Camisetas de Compresión Gótica · Ropa Deportiva Oscura",
    template: "%s | Y2K Fit Honduras",
  },
  description:
    "Camisetas de compresión en Honduras con estética gótica. Ropa deportiva oscura inspirada en Breathe Divinity — la primera marca local de su tipo hecha en Honduras. Envíos a todo el país.",
  keywords: [
    "camisetas de compresión Honduras",
    "ropa de compresión Honduras",
    "compression shirt Honduras",
    "ropa deportiva gótica",
    "ropa gótica Honduras",
    "ropa gym oscura",
    "alternativa Breathe Divinity",
    "Midnight Studios Honduras",
    "y2k streetwear Honduras",
    "ropa alternativa Tegucigalpa",
    "ropa gym San Pedro Sula",
    "Y2K Fit Honduras",
  ],
  applicationName: "Y2K Fit Honduras",
  authors: [{ name: "Y2K Fit Honduras" }],
  creator: "Y2K Fit Honduras",
  publisher: "Y2K Fit Honduras",
  category: "ecommerce",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_HN",
    siteName: "Y2K Fit Honduras",
    title:
      "Y2K Fit Honduras | Camisetas de Compresión Gótica · Ropa Deportiva Oscura",
    description:
      "Camisetas de compresión con estética gótica, hechas en Honduras. Inspirado en Breathe Divinity y la nueva ola de ropa deportiva oscura. Envíos a todo el país.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Y2K Fit Honduras | Camisetas de Compresión Gótica",
    description:
      "Camisetas de compresión con estética gótica · Hecho en Honduras · Drop 001",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: {
      "es-HN": "/hn",
    },
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const baseUrl = getBaseURL()
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Y2K Fit Honduras",
    alternateName: "Y2K Fit",
    url: baseUrl,
    logo: `${baseUrl}/mainlogo.svg`,
    description:
      "Marca hondureña de camisetas de compresión con estética gótica. Ropa deportiva oscura inspirada en Breathe Divinity.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "HN",
    },
  }
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Y2K Fit Honduras",
    url: baseUrl,
    inLanguage: "es-HN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/hn/store?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <html
      lang="es-HN"
      data-mode="light"
      className={`${unifraktur.variable} ${cinzel.variable} ${inter.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
