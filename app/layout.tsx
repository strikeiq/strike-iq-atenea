import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Strike IQ — Atenea',
  description: 'Panel de gestión de jugadores Atenea',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-zinc-100 antialiased">{children}</body>
    </html>
  )
}
