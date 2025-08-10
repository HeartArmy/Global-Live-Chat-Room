import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://live-chat.example.com'
  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1,
    },
  ]
}
