import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Global Live Chat - Chat Room for the World',
  description: 'Join the ultimate global chat room where people from around the world can connect, share, and chat in real-time. Beautiful Apple-style design with anti-bot protection.',
  keywords: 'global chat, live chat, world chat, real-time messaging, global community',
  authors: [{ name: 'Arham' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#007AFF',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1C1C1E',
              color: '#fff',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />
      </body>
    </html>
  )
}
