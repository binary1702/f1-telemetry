import Link from 'next/link'
import GuideShell from '@/components/setups/guide/GuideShell'
import BalanceLab from '@/components/setups/guide/BalanceLab'
import GripLab from '@/components/setups/guide/GripLab'
import { ColourLegend } from '@/components/setups/guide/Glossary'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-800 rounded bg-gray-900/30">
      <div className="px-3 py-1.5 border-b border-gray-800 text-[10px] text-gray-400 tracking-wider font-bold">{title}</div>
      <div className="p-3">{children}</div>
    </section>
  )
}

/** Symptom → which of the three sources it is → where to go */
/** Grouped by problem, then ordered: slow corners, fast corners, then pedal-tied */
const READ: Array<{ when: 'understeer' | 'oversteer'; speed: string; source: 'mechanical' | 'aero' | 'weight'; go: Array<{ id: string; label: string; dir: '↑' | '↓' }> }> = [
  // understeer
  { when: 'understeer', speed: 'slow corners only (< 60 mph)', source: 'mechanical',
    go: [{ id: 'frontAntiRollBar', label: 'F.ARB', dir: '↓' }, { id: 'frontToe', label: 'F.TOE', dir: '↑' }, { id: 'frontCamber', label: 'F.CAMBER', dir: '↓' }] },
  { when: 'understeer', speed: 'fast corners only (130+ mph)', source: 'aero',
    go: [{ id: 'frontWing', label: 'F.WING', dir: '↑' }, { id: 'rearWing', label: 'R.WING', dir: '↓' }] },
  { when: 'understeer', speed: 'on exit, when you get on the throttle', source: 'weight',
    go: [{ id: 'diffOnThrottle', label: 'DIFF ON', dir: '↓' }, { id: 'frontWing', label: 'F.WING', dir: '↑' }] },
  // oversteer
  { when: 'oversteer', speed: 'slow corners only (< 60 mph)', source: 'mechanical',
    go: [{ id: 'rearAntiRollBar', label: 'R.ARB', dir: '↓' }, { id: 'rearSuspension', label: 'R.SUSP', dir: '↓' }, { id: 'rearToe', label: 'R.TOE', dir: '↑' }] },
  { when: 'oversteer', speed: 'fast corners only (130+ mph)', source: 'aero',
    go: [{ id: 'rearWing', label: 'R.WING', dir: '↑' }, { id: 'frontWing', label: 'F.WING', dir: '↓' }] },
  { when: 'oversteer', speed: 'on entry, while braking', source: 'weight',
    go: [{ id: 'brakeBias', label: 'BIAS', dir: '↑' }, { id: 'diffOffThrottle', label: 'DIFF OFF', dir: '↑' }] },
  { when: 'oversteer', speed: 'on exit, when you get on the throttle', source: 'weight',
    go: [{ id: 'diffOnThrottle', label: 'DIFF ON', dir: '↑' }, { id: 'rearSuspension', label: 'R.SUSP', dir: '↓' }] }
]

const SOURCE_CLASS = {
  mechanical: 'bg-gray-700/60 text-gray-200',
  aero: 'bg-purple-500/20 text-purple-200',
  weight: 'bg-fuchsia-500/15 text-fuchsia-200'
} as const
const SOURCE_LABEL = {
  mechanical: 'springs, bars, tyres',
  aero: 'wings',
  weight: 'pedals'
} as const

export default function BalancePage() {
  return (
    <GuideShell title="BALANCE" active="balance">
      <ColourLegend />

      <Section title="BALANCE = SUSPENSION & TYRES + WINGS + WHAT THE PEDALS DO">
        <p className="mb-2 text-[10px] text-gray-500">
          Three things push the balance. Each bar is one push from the neutral line. The circle is where they net out. Move the sliders and the speed.
        </p>
        <BalanceLab />
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <Section title="THE ONE RULE · WHICH END LETS GO FIRST">
          <GripLab />
        </Section>

        <Section title="READ YOUR CAR · WHICH SOURCE IS IT">
          <div className="flex flex-col gap-3">
            {(['understeer', 'oversteer'] as const).map(problem => (
              <div key={problem}>
                <div className={`mb-1 text-[10px] font-bold tracking-wider ${problem === 'understeer' ? 'text-blue-300' : 'text-orange-300'}`}>
                  {problem.toUpperCase()}
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs items-center">
                  <span className="text-[9px] text-gray-600">when</span>
                  <span className="text-[9px] text-gray-600">source</span>
                  <span className="text-[9px] text-gray-600">turn</span>
                  {READ.filter(r => r.when === problem).map((r, i) => (
                    <div key={i} className="contents">
                      <span className="text-gray-300">{r.speed}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ${SOURCE_CLASS[r.source]}`}>{SOURCE_LABEL[r.source]}</span>
                      <span className="flex gap-1">
                        {r.go.map(g => (
                          <Link key={g.id} href={`/setups/${g.id}`} className="px-1.5 py-0.5 rounded bg-gray-800/80 text-[10px] text-gray-100 hover:bg-gray-700 whitespace-nowrap">
                            <span className={`font-bold ${g.dir === '↑' ? 'text-orange-300' : 'text-blue-300'}`}>{g.dir}</span> {g.label}
                          </Link>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[9px] text-gray-500">
            speed tells you the source: only slow corners → springs, bars, tyres · only fast corners → wings · tied to a pedal → pedals · everywhere → both
          </div>
        </Section>
      </div>

      <Section title="HOW TO TUNE · IN ORDER">
        <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-xs">
          {[
            { n: 1, t: 'Warm the tyres first', d: 'Cold tyres lie. Two laps before you judge anything.' },
            { n: 2, t: 'Fix slow corners first', d: 'Springs, bars and tyres are the base. Wings sit on top.' },
            { n: 3, t: 'Then fast corners with wings', d: 'Change the gap between front and rear wing, not both.' },
            { n: 4, t: 'One click, one lap', d: 'Change one thing. If you cannot feel it, it was not the problem.' }
          ].map(s => (
            <li key={s.n} className="border border-gray-800 rounded p-2 flex gap-2">
              <span className="text-lg font-bold text-gray-600 leading-none">{s.n}</span>
              <span>
                <span className="block text-gray-100 font-medium">{s.t}</span>
                <span className="block text-[10px] text-gray-400">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-2 px-3 py-1.5 border-l-2 border-green-600 bg-green-900/10 text-xs text-green-200 font-medium">
          Beginner target: a little understeer everywhere, and the same balance in slow and fast corners. Same balance = the wings push the same way the suspension does.
        </div>
      </Section>

      <div className="text-[10px] text-gray-500 px-1">
        What understeer and oversteer actually look like → <Link href="/setups/understeer-oversteer" className="text-green-400 hover:text-green-300">Understeer &amp; Oversteer</Link>
      </div>
    </GuideShell>
  )
}
