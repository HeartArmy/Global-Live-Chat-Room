import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://live-chat.example.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api', '/api/*'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
