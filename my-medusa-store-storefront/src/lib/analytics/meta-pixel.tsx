"use client"

import { CATALOG_PARAMS } from "@lib/util/catalog"
import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo } from "react"

declare global {
  interface Window {
    fbq?: (...args: any[]) => void
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) {
  if (typeof window !== "undefined" && window.fbq) {
    // Pass eventID when present so a future server-side Conversions API event
    // with the same eventID is deduplicated against this browser event.
    if (options?.eventID) {
      window.fbq("track", event, params, options)
    } else {
      window.fbq("track", event, params)
    }
  }
}

// Listing filters, sort, search and "ver más" rewrite the query string in
// place; counting each tap as a PageView would inflate what Meta reports and
// builds audiences from. Every other key (checkout's ?step=) still counts.
// This tracker is the only PageView source. The base code sets
// `disablePushState` (otherwise fbevents.js fires its own PageView on every
// history.replaceState and these exclusions would not matter) and
// `allowDuplicatePageViews` (otherwise the pixel treats the whole visit as one
// page and drops every PageView after the landing one).
const IN_PAGE_PARAMS: string[] = Object.values(CATALOG_PARAMS)

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pageQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    IN_PAGE_PARAMS.forEach((key) => params.delete(key))
    return params.toString()
  }, [searchParams])

  useEffect(() => {
    trackMetaEvent("PageView")
  }, [pathname, pageQuery])

  return null
}

export default function MetaPixel() {
  if (!PIXEL_ID) {
    return null
  }

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq.disablePushState = true;
          fbq.allowDuplicatePageViews = true;
          fbq('init', '${PIXEL_ID}');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  )
}
