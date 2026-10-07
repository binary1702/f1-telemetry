import Link from 'next/link'
import { SETUP_PARAMETERS, CORNER_PHASES, CornerPhase, SetupParameterDefinition } from '@/data/setupParameters'
import GuideShell from '@/components/setups/guide/GuideShell'
import BalanceDiagram from '@/components/setups/guide/BalanceDiagram'
import GripLab from '@/components/setups/guide/GripLab'
import UndersteerGradient from '@/components/setups/guide/UndersteerGradient'
import OversteerTrace from '@/components/setups/guide/OversteerTrace'
import { ColourLegend } from '@/components/setups/guide/Glossary'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-800 rounded bg-gray-900/30">
      <div className="px-3 py-1.5 border-b border-gray-800 text-[10px] text-gray-400 tracking-wider font-bold">{title}</div>
      <div className="p-3">{children}</div>
    </section>
  )
}

/**
 * Which knob fixes which problem, generated from the matrix.
 * To cure understeer at a phase we need a + shift there: raise knobs whose
 * `higher` is +, lower knobs whose `higher` is −. Oversteer is the mirror.
 * Aero knobs only work at speed; everything else works at any speed.
 */
type Fix = { param: SetupParameterDefinition; dir: 'raise' | 'lower'; mag: number; fast: boolean }

function fixesFor(problem: 'understeer' | 'oversteer', phase: CornerPhase): Fix[] {
  const i = CORNER_PHASES.indexOf(phase)
  const want = problem === 'understeer' ? 1 : -1
  return SETUP_PARAMETERS
    .filter(p => p.higher[i] !== 0)
    .map(p => ({
      param: p,
      dir: (Math.sign(p.higher[i]) === want ? 'raise' : 'lower') as 'raise' | 'lower',
      mag: Math.abs(p.higher[i]),
      fast: p.category === 'aerodynamics'
    }))
    .sort((a, b) => b.mag - a.mag)
}

function FixChip({ f }: { f: Fix }) {
  const color = f.dir === 'raise' ? 'text-orange-300' : 'text-blue-300'
  return (
    <Link
      href={`/setups/${f.param.id}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap hover:bg-gray-800 ${
        f.mag === 2 ? 'bg-gray-800/80 text-gray-100' : 'bg-gray-900 text-gray-400 border border-gray-800'
      }`}
      title={`${f.dir} ${f.param.name}${f.fast ? ' · fast corners only' : ''}`}
    >
      <span className={`font-bold ${color}`}>{f.dir === 'raise' ? '↑' : '↓'}</span>
      {f.param.shortName ?? f.param.name}
      {f.fast && <span className="text-gray-600">130+</span>}
    </Link>
  )
}

const COMPARE: Array<{ label: string; under: string; over: string }> = [
  { label: 'the car', under: 'turns less than you steer', over: 'turns more than you steer' },
  { label: 'where it goes', under: 'wide, toward the outside', over: 'rear swings out, nose points in' },
  { label: 'which tyres slide', under: 'front', over: 'rear' },
  { label: 'your hands', under: 'add more lock, nothing happens', over: 'opposite lock to catch it' },
  { label: 'most common', under: 'entry and apex', over: 'exit, on the throttle' },
  { label: 'feels', under: 'safe, slow, frustrating', over: 'fast, scary, costs tyres' },
  { label: 'if it gets worse', under: 'you run off the outside', over: 'you spin' }
]

export default function BalancePage() {
  return (
    <GuideShell title="UNDERSTEER · OVERSTEER" active="understeer-oversteer">
      <ColourLegend />

      <Section title="WHAT IT LOOKS LIKE FROM ABOVE">
        <BalanceDiagram />
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <Section title="WHICH END LETS GO FIRST">
          <GripLab />
        </Section>

        <Section title="SIDE BY SIDE">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-xs">
            <span />
            <span className="text-blue-300 font-bold tracking-wider text-[10px]">UNDERSTEER</span>
            <span className="text-orange-300 font-bold tracking-wider text-[10px]">OVERSTEER</span>
            {COMPARE.map(r => (
              <div key={r.label} className="contents">
                <span className="text-gray-500 text-[10px] whitespace-nowrap">{r.label}</span>
                <span className="text-gray-200">{r.under}</span>
                <span className="text-gray-200">{r.over}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 px-3 py-1.5 border-l-2 border-green-600 bg-green-900/10 text-xs text-green-200 font-medium">
            Beginner target: a little understeer. It is slower but it is recoverable. Oversteer spins you.
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
        <Section title="TELEMETRY · UNDERSTEER">
          <UndersteerGradient />
        </Section>
        <Section title="TELEMETRY · OVERSTEER">
          <OversteerTrace />
        </Section>
      </div>

      <Section title="WHICH KNOB · BY PHASE">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 text-xs">
          <span />
          <span className="text-blue-300 font-bold tracking-wider text-[10px]">FIX UNDERSTEER</span>
          <span className="text-orange-300 font-bold tracking-wider text-[10px]">FIX OVERSTEER</span>
          {CORNER_PHASES.map(phase => (
            <div key={phase} className="contents">
              <span className="text-gray-400 uppercase tracking-wider text-[10px] pt-0.5">{phase}</span>
              <div className="flex flex-wrap gap-1">{fixesFor('understeer', phase).map(f => <FixChip key={f.param.id} f={f} />)}</div>
              <div className="flex flex-wrap gap-1">{fixesFor('oversteer', phase).map(f => <FixChip key={f.param.id} f={f} />)}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 text-[9px] text-gray-500">
          <span>bright chip = main effect, dim = side effect</span>
          <span><span className="text-gray-600">130+</span> = fast corners only</span>
          <span>↑ raise · ↓ lower · click a chip for its page</span>
        </div>
      </Section>
    </GuideShell>
  )
}
