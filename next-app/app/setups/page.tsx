'use client'

import Link from 'next/link'
import SetupExplorer from '@/components/setups/SetupExplorer'

export default function SetupsPage() {
  return (
    <div className="h-screen flex flex-col">
      <header className="flex-shrink-0 flex items-center gap-3 p-3 border-b border-gray-800">
        <h1 className="text-sm tracking-wider font-bold">SETUP EXPLORER</h1>
        <span className="text-gray-600">|</span>
        <nav className="flex gap-3 text-xs">
          <Link href="/" className="text-gray-400 hover:text-white">coach</Link>
          <Link href="/live" className="text-gray-400 hover:text-white">live</Link>
          <Link href="/sessions" className="text-gray-400 hover:text-white">sessions</Link>
          <Link href="/compare" className="text-gray-400 hover:text-white">compare</Link>
        </nav>
      </header>

      <main className="flex-1 min-h-0">
        <SetupExplorer />
      </main>
    </div>
  )
}
