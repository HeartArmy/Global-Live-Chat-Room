import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin'
import { extractRouterConfig } from 'uploadthing/server'
import { ourFileRouter } from '@/app/api/uploadthing/core'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://true-live-chat.vercel.app/'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Chat Room for the World',
    template: '%s · Chat Room for the World',
  },
  description: 'A global chat room where anyone can connect and chat with people from around the world.',
  keywords: ['chat', 'global chat', 'world chat', 'live chat', 'community'],
  authors: [{ name: 'Arham' }],
  alternates: {
    canonical: siteUrl,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'Chat Room for the World',
    description: 'Connect with people from around the globe in a beautiful, realtime chat.',
    siteName: 'Chat Room for the World',
    images: [
      {
        url: `${siteUrl}/logo.png`,
        width: 1200,
        height: 630,
        alt: 'Chat Room for the World',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chat Room for the World',
    description: 'Connect with people from around the globe in a beautiful, realtime chat.',
    images: [`${siteUrl}/logo.png`],
  },
  icons: {
    icon: [
      // SVGs (use color-scheme-specific icons; omit generic to respect media queries in Chrome)
      { url: '/icon-dark.svg?v=2', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      // Force light icon in dark mode as requested
      { url: '/icon-light.svg?v=2', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
      // PNG fallbacks (optional)
      { url: '/favicon-32x32.png?v=2', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png?v=2', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/icon-light.svg?v=2' }],
    // No .ico shortcut; rely on SVGs above
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sf-pro antialiased bg-white dark:bg-apple-dark">
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Chat Room for the World',
              url: siteUrl,
              description:
                'Connect with people from around the globe in a beautiful, realtime chat.',
              inLanguage: 'en',
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteUrl}/?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Chat Room for the World',
              url: siteUrl,
              logo: `${siteUrl}/logo.png`,
            }),
          }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
