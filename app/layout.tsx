import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://live-chat.example.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Chat Room for the World',
    template: '%s · Chat Room for the World',
  },
  description: 'A global chat room where anyone can connect and chat with people from around the world.',
  keywords: ['chat', 'global chat', 'world chat', 'live chat', 'community'],
  authors: [{ name: 'Arham' }],
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chat Room for the World',
    description: 'Connect with people from around the globe in a beautiful, realtime chat.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [{ url: '/icon-light.svg' }],
    shortcut: ['/favicon.svg'],
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
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
