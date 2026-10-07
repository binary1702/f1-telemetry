'use client'

import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="p-3">
      <header className="flex items-center gap-4 mb-4">
        <h1 className="text-sm tracking-wider">F1 25 COACH</h1>
        <span className="text-gray-500">|</span>
        <nav className="flex gap-3 text-xs">
          <Link href="/live" className="text-gray-400 hover:text-white">live</Link>
          <Link href="/sessions" className="text-gray-400 hover:text-white">sessions</Link>
          <Link href="/compare" className="text-gray-400 hover:text-white">compare</Link>
          <Link href="/setups" className="text-gray-400 hover:text-white">setups</Link>
        </nav>
      </header>

      <div className="border border-gray-700 rounded-lg p-6 bg-gray-900/50">
        <p className="text-gray-400 text-sm">
          This is the Next.js version of the F1 telemetry app.
        </p>
        <p className="text-gray-500 text-xs mt-4">
          Pages are being migrated from vanilla HTML/JS.
        </p>
      </div>
    </div>
  )
}
