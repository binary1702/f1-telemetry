'use client'

import Link from 'next/link'

export default function SessionsPage() {
  return (
    <div className="p-3">
      <header className="flex items-center gap-3 mb-4">
        <h1 className="text-sm tracking-wider">SESSIONS</h1>
        <Link href="/" className="text-gray-400 text-xs">coach</Link>
        <Link href="/live" className="text-gray-400 text-xs">live</Link>
        <Link href="/compare" className="text-gray-400 text-xs">compare</Link>
        <Link href="/setups" className="text-gray-400 text-xs">setups</Link>
      </header>

      <div className="border border-gray-700 rounded-lg p-6 bg-gray-900/50">
        <p className="text-gray-400 text-sm">
          Sessions page - migration in progress.
        </p>
      </div>
    </div>
  )
}
