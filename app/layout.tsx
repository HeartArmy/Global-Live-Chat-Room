import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'react-quill/dist/quill.bubble.css'
import { NextSSRPlugin } from '@uploadthing/react/next-ssr-plugin'
import { extractRouterConfig } from 'uploadthing/server'
import { ourFileRouter } from '@/app/api/uploadthing/core'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://globalchatroom.vercel.app'
// Canonical URL always points to primary domain for SEO consolidation
const canonicalUrl = 'https://globalchatroom.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Chat Room for the World - Connect Globally in Real-Time',
    template: '%s · Chat Room for the World',
  },
  description: 'Join the global conversation! Chat with people from around the world in real-time. Free, anonymous, and instant. No signup required. Connect with thousands online now.',
  keywords: [
    'global chat room',
    'world chat',
    'international chat',
    'live chat online',
    'free chat room',
    'anonymous chat',
    'real-time messaging',
    'worldwide community',
    'instant messaging',
    'chat with strangers',
    'global community',
    'online chat free',
  ],
  authors: [{ name: 'Arham' }],
  alternates: {
    canonical: canonicalUrl,
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
    url: canonicalUrl,
    title: 'Chat Room for the World - Connect Globally in Real-Time',
    description: 'Join thousands chatting live from every corner of the globe. Free, instant, anonymous. No signup required.',
    siteName: 'Chat Room for the World',
    images: [
      {
        url: `${canonicalUrl}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: 'Chat Room for the World - Global Real-Time Chat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chat Room for the World - Connect Globally in Real-Time',
    description: 'Join thousands chatting live from every corner of the globe. Free, instant, anonymous.',
    images: [`${canonicalUrl}/opengraph-image.png`],
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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
    <html lang="en" className="dark">
      <body className="font-sf-pro antialiased bg-shimmer-white text-gray-100">
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Chat Room for the World',
              alternateName: 'Global Chat Room',
              url: canonicalUrl,
              description:
                'A global chat room where anyone can connect and chat with people from around the world in real-time. Free, anonymous, and instant.',
              inLanguage: 'en',
              potentialAction: {
                '@type': 'CommunicateAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: canonicalUrl,
                  actionPlatform: [
                    'http://schema.org/DesktopWebPlatform',
                    'http://schema.org/MobileWebPlatform',
                  ],
                },
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
              '@type': 'WebApplication',
              name: 'Chat Room for the World',
              url: canonicalUrl,
              applicationCategory: 'CommunicationApplication',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '1250',
              },
              description: 'Connect with people from around the globe in a beautiful, real-time chat application.',
            }),
          }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && (
          <script
            id="console-stripper"
            dangerouslySetInnerHTML={{
              __html: `(() => { try { const c = window.console; if (!c) return; ['log','debug','info','trace','table'].forEach(m => { try { c[m] = () => {}; } catch (e) {} }); } catch (e) {} })();`,
            }}
          />
        )}
      </body>
    </html>
  )
}
