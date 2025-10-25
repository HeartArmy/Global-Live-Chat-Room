import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Always use canonical URL for SEO consolidation
  const canonical = 'https://globalchatroom.vercel.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api', '/api/*'],
      },
    ],
    sitemap: `${canonical}/sitemap.xml`,
    host: canonical,
  }
}
