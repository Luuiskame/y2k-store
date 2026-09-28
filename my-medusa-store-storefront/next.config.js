const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * Sent with every response. Vercel already adds Strict-Transport-Security, so
 * it is not repeated here. Deliberately no full Content-Security-Policy: the
 * Meta Pixel, Stripe and Next's own inline scripts would need nonces, and a
 * nonce forces every page to render dynamically. The directives below cannot
 * break a script and still shut the doors that matter:
 *
 * - frame-ancestors / X-Frame-Options: nobody can frame the checkout and
 *   overlay it (clickjacking). X-Frame-Options covers older browsers.
 * - nosniff: the browser uses the declared Content-Type and never guesses one
 *   that turns an upload or a JSON response into HTML or script.
 * - base-uri / object-src: an injected <base> cannot re-point relative URLs,
 *   and no plugin content can load.
 * - Permissions-Policy: the store uses none of these APIs, so nothing embedded
 *   in it can ask for them either.
 */
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
]

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }]
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },

      {
        protocol: "https",
        hostname: "media.y2kfithn.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
