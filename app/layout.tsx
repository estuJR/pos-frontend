import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'El Jardín de los Conejos - POS',
  description: 'Sistema de punto de venta para El Jardín de los Conejos Tacos',
  generator: 'El jardin de los conejos',
  openGraph: {
    title: 'El Jardín de los Conejos - POS',
    description: 'Sistema de punto de venta para El Jardín de los Conejos Tacos',
    images: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20pantalla%202026-03-16%20a%20la%28s%29%204.57.42%E2%80%AFp.%C2%A0m.-GNN97ECZah8oBuwyg4QJsUGeewX9cX.png',
        width: 800,
        height: 800,
        alt: 'El Jardín de los Conejos',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}