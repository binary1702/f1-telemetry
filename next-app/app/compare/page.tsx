'use client'

import Link from 'next/link'

export default function ComparePage() {
  return (
    <div className="p-3">
      <header className="flex items-center gap-3 mb-4">
        <h1 className="text-sm tracking-wider">
          LAP COMPARE
          <Link href="/" className="text-gray-400 font-normal text-xs ml-4">coach</Link>
          <Link href="/sessions" className="text-gray-400 font-normal text-xs ml-3">sessions</Link>
          <Link href="/live" className="text-gray-400 font-normal text-xs ml-3">live</Link>
          <Link href="/setups" className="text-gray-400 font-normal text-xs ml-3">setups</Link>
        </h1>
      </header>

      <div className="border border-gray-700 rounded-lg p-6 bg-gray-900/50">
        <p className="text-gray-400 text-sm">
          Compare page - migration in progress.
        </p>
      </div>
    </div>
  )
}
