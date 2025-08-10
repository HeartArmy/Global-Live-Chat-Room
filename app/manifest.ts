import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const name = 'Chat Room for the World'
  const shortName = 'World Chat'
  const description = 'Connect with people from around the globe in a beautiful, realtime chat.'
  const startUrl = '/'

  return {
    name,
    short_name: shortName,
    description,
    start_url: startUrl,
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    lang: 'en',
    dir: 'ltr',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-light.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-dark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['social', 'communication'],
    shortcuts: [
      {
        name: 'Open Chat',
        short_name: 'Chat',
        url: '/',
      },
    ],
    id: '/',
    prefer_related_applications: false,
  }
}
