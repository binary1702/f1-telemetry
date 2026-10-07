'use client'

import Link from 'next/link'

export default function LivePage() {
  return (
    <div className="p-3">
      <header className="flex items-center gap-4 mb-4">
        <h1 className="text-sm tracking-wider">
          F1 25 TELEMETRY
          <Link href="/" className="text-gray-400 font-normal text-xs ml-4">coach</Link>
          <Link href="/sessions" className="text-gray-400 font-normal text-xs ml-3">sessions</Link>
          <Link href="/compare" className="text-gray-400 font-normal text-xs ml-3">compare</Link>
          <Link href="/setups" className="text-gray-400 font-normal text-xs ml-3">setups</Link>
        </h1>
      </header>

      <div className="border border-gray-700 rounded-lg p-6 bg-gray-900/50">
        <p className="text-gray-400 text-sm">
          Live telemetry page - migration in progress.
        </p>
      </div>
    </div>
  )
}
