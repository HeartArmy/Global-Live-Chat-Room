import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // Always use canonical URL in sitemap for SEO consolidation
  const canonical = 'https://globalchatroom.vercel.app'
  return [
    {
      url: canonical,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
  ]
}
