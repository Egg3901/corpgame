import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Oxygen:wght@300;400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-gray-900 transition-colors duration-200 dark:bg-gray-950 dark:text-gray-100 font-eurostile">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}



