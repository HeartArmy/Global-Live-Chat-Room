import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chat Room for the World',
  description: 'A global chat room where anyone can connect and chat with people from around the world.',
  keywords: 'chat, global chat, world chat, live chat, community',
  authors: [{ name: 'Arham' }],
  viewport: 'width=device-width, initial-scale=1',
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
      </body>
    </html>
  )
}
