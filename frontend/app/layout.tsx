import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Corporate Sim - Multiplayer Business Strategy Game',
  description: 'Build your corporate empire in this hourly turn-based multiplayer simulation game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


