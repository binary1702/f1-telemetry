import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'F1 Setup Explorer',
  description: 'Interactive F1 25 car setup visualization and learning tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-f1-bg text-f1-text min-h-screen">
        {children}
      </body>
    </html>
  )
}
