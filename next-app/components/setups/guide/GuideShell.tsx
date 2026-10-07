import Link from 'next/link'
import { F1Setup, CAR_ZONES } from '@/types/setup'
import { getParametersByZone } from '@/data/setupParameters'
import { hasGuide } from '@/data/setupGuide'

/**
 * Shared frame for every guide page: header, left sidebar (glossary + the 20
 * settings grouped by zone, same grouping as the explorer), content on the right.
 */

interface GuideShellProps {
  title: string
  /** Extra chips after the title */
  meta?: React.ReactNode
  /** Which sidebar entry is current: a parameter id or a general page */
  active: keyof F1Setup | 'glossary' | 'balance' | 'understeer-oversteer'
  children: React.ReactNode
}

function SidebarLink({ href, current, children, written }: {
  href: string; current: boolean; children: React.ReactNode; written?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-2 py-1 rounded text-[11px] transition-colors ${
        current ? 'bg-green-500/15 text-green-300' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      }`}
    >
      <span className="truncate">{children}</span>
      {written && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="full guide written" />}
    </Link>
  )
}

export default function GuideShell({ title, meta, active, children }: GuideShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex-shrink-0 flex items-center gap-3 p-3 border-b border-gray-800 w-full">
        <Link href="/setups" className="text-xs text-gray-400 hover:text-white">◀ setup explorer</Link>
        <span className="text-gray-600">|</span>
        <h1 className="text-sm tracking-wider font-bold">{title}</h1>
        {meta}
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-48 flex-shrink-0 border-r border-gray-800 p-2 flex flex-col gap-3 overflow-y-auto">
          <div>
            <div className="px-2 pb-1 text-[9px] text-gray-500 tracking-wider font-bold">GENERAL</div>
            <SidebarLink href="/setups/balance" current={active === 'balance'}>Balance</SidebarLink>
            <SidebarLink href="/setups/understeer-oversteer" current={active === 'understeer-oversteer'}>Understeer &amp; Oversteer</SidebarLink>
            <SidebarLink href="/setups/glossary" current={active === 'glossary'}>Glossary</SidebarLink>
          </div>

          {CAR_ZONES.map(zone => (
            <div key={zone.id}>
              <div className="px-2 pb-1 text-[9px] text-gray-500 tracking-wider font-bold">{zone.shortName}</div>
              <div className="flex flex-col gap-0.5">
                {getParametersByZone(zone.id).map(p => (
                  <SidebarLink
                    key={p.id}
                    href={`/setups/${p.id}`}
                    current={active === p.id}
                    written={hasGuide(p.id)}
                  >
                    {p.name}
                  </SidebarLink>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-auto px-2 pt-2 text-[9px] text-gray-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> guide written
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-3 flex flex-col gap-2">
          {children}
        </main>
      </div>
    </div>
  )
}
