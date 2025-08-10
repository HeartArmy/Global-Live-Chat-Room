/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production'
    const csp = [
      "default-src 'self'",
      // Allow inline styles from Next/Tailwind only as 'unsafe-inline' is avoided; using nonce is complex here, so allow 'self'
      "style-src 'self' 'unsafe-inline'",
      // Vercel analytics and images
      "img-src 'self' data: blob: https:",
      // Allow Next.js inline scripts and Vercel analytics
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vitals.vercel-insights.com",
      // Connect to our APIs and Vercel analytics
      "connect-src 'self' https://vitals.vercel-insights.com https://vitals.vercel-analytics.com",
      // Fonts
      "font-src 'self' data:",
      // Frames blocked
      "frame-ancestors 'none'",
      // Media
      "media-src 'self'",
      // Workers
      "worker-src 'self' blob:",
      // Base
      "base-uri 'self'",
      // Form actions
      "form-action 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
}

export default nextConfig
