import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Corporate Warfare - Multiplayer Business Strategy Game',
  description: 'Build your corporate empire in this hourly turn-based multiplayer simulation game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Oxygen:wght@300;400;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className="text-[rgb(var(--foreground-rgb))] transition-colors duration-200 bloomberg:bg-black bloomberg:text-[#00ff41] font-eurostile"
        style={{
          background: `linear-gradient(to bottom, transparent, rgb(var(--background-end-rgb))) rgb(var(--background-start-rgb))`
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}



