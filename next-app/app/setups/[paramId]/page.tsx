import Link from 'next/link'
import { notFound } from 'next/navigation'
import { F1Setup, DEFAULT_SETUP, CAR_ZONES, SETUP_CATEGORIES } from '@/types/setup'
import {
  SETUP_PARAMETERS,
  getParameter,
  getAxleForParameter,
  getZoneForParameter,
  CORNER_PHASES
} from '@/data/setupParameters'
import { getGuide } from '@/data/setupGuide'
import BalanceMatrix from '@/components/setups/BalanceMatrix'
import CornerPhaseDiagram from '@/components/setups/guide/CornerPhaseDiagram'
import UndersteerGradient from '@/components/setups/guide/UndersteerGradient'
import { getGuideVisuals } from '@/components/setups/guide'
import GuideShell from '@/components/setups/guide/GuideShell'
import { ColourLegend } from '@/components/setups/guide/Glossary'

export function generateStaticParams() {
  return SETUP_PARAMETERS.map(p => ({ paramId: p.id }))
}

const AXLE_LABEL = { front: 'FRONT AXLE', rear: 'REAR AXLE', both: 'BOTH AXLES' } as const
const PHASE_CLASS: Record<string, string> = {
  entry: 'bg-red-500/70',
  apex: 'bg-yellow-500/70',
  exit: 'bg-green-500/70',
  straight: 'bg-gray-500/70'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-800 rounded bg-gray-900/30">
      <div className="px-3 py-1.5 border-b border-gray-800 text-[10px] text-gray-400 tracking-wider font-bold">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

export default function SetupParameterPage({ params }: { params: { paramId: string } }) {
  const param = getParameter(params.paramId as keyof F1Setup)
  if (!param) notFound()

  const guide = getGuide(param.id)
  const visuals = getGuideVisuals(param.id)
  const zone = CAR_ZONES.find(z => z.id === getZoneForParameter(param))
  const category = SETUP_CATEGORIES.find(c => c.id === param.category)
  const axle = getAxleForParameter(param)

  return (
    <GuideShell
      title={param.name.toUpperCase()}
      active={param.id}
      meta={
        <>
          <span className="text-[10px] text-gray-500 tracking-wider">{AXLE_LABEL[axle]}</span>
          {zone && <span className="text-[10px] text-gray-600">{zone.shortName}</span>}
          {category && <span className="text-[10px] text-gray-600">{category.shortName}</span>}
          <Link href="/setups/glossary" className="ml-auto text-[10px] text-gray-500 hover:text-green-400">
            glossary →
          </Link>
        </>
      }
    >
        {/* Show first: full-width visuals, then half-width ones beside the corner picture */}
        {visuals.filter(v => v.width === 'full').map(v => (
          <Section key={v.title} title={v.title}>
            <p className="mb-2 text-[10px] text-gray-500">{v.caption}</p>
            <v.Component />
          </Section>
        ))}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {visuals.filter(v => v.width === 'half').map(v => (
            <Section key={v.title} title={v.title}>
              <p className="mb-2 text-[10px] text-gray-500">{v.caption}</p>
              <v.Component />
            </Section>
          ))}
          <Section title="ON THE CORNER">
            <CornerPhaseDiagram param={param} />
          </Section>
        </div>

        {/* Then tell: two lines and the rules, beside the matrix */}
        <div className={`grid grid-cols-1 gap-2 ${guide ? 'xl:grid-cols-2' : ''}`}>
        {guide && (
          <Section title="IN SHORT">
            <div className="flex flex-col gap-1.5">
              {guide.plain.map((row, i) => {
                const toneClass =
                  row.tone === 'higher' ? 'bg-orange-500/20 text-orange-200'
                  : row.tone === 'lower' ? 'bg-blue-500/20 text-blue-200'
                  : 'bg-gray-800 text-gray-200'
                const last = row.steps.length - 1
                return (
                  <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                    {row.steps.map((s, j) => {
                      const isLast = j === last
                      const chip =
                        isLast && row.strength === 'strong' ? 'bg-gray-100 text-gray-900 font-bold'
                        : isLast && row.strength === 'weak' ? 'bg-gray-900 text-gray-600 border border-gray-800'
                        : j === 0 ? toneClass
                        : 'bg-gray-800/70 text-gray-200'
                      return (
                        <span key={j} className="contents">
                          <span className={`px-2 py-0.5 rounded whitespace-nowrap ${chip}`}>{s}</span>
                          {!isLast && <span className="text-gray-600">→</span>}
                        </span>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            {guide.rules && (
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs items-baseline">
                {guide.rules.map((r, i) => (
                  <div key={i} className="contents">
                    <span className="text-gray-300">{r.when}</span>
                    <span
                      className={`text-center font-bold ${
                        r.then === 'raise' ? 'text-orange-300' : r.then === 'lower' ? 'text-blue-300' : 'text-gray-600'
                      }`}
                    >
                      {r.then === 'raise' ? '↑' : r.then === 'lower' ? '↓' : '—'}
                    </span>
                    <span className="text-gray-100">{r.do}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Spine: the same matrix the explorer bar shows */}
        <Section title="↑ ↓  ×  ENTRY · APEX · EXIT · STRAIGHT">
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-start">
            <div className="min-w-0 max-w-full overflow-x-auto">
              <BalanceMatrix param={param} />
            </div>
            <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[10px]">
              <dt className="text-gray-500">range</dt>
              <dd className="text-gray-200 tabular-nums">
                {param.min}{param.unit} to {param.max}{param.unit}
                <span className="text-gray-600 ml-1">step {param.step}</span>
              </dd>
              <dt className="text-gray-500">default</dt>
              <dd className="text-gray-200 tabular-nums">{DEFAULT_SETUP[param.id]}{param.unit}</dd>
              <dt className="text-gray-500">range source</dt>
              <dd className={param.rangeVerified ? 'text-gray-200' : 'text-yellow-500'}>
                {param.rangeVerified ? 'verified F1 25' : 'estimated'}
              </dd>
              {param.higherMeans && (
                <>
                  <dt className="text-gray-500">higher =</dt>
                  <dd className="text-gray-200">{param.higherMeans}</dd>
                </>
              )}
            </dl>
          </div>
          <p className="mt-2 text-xs text-gray-300">{param.mechanism}</p>
        </Section>
        </div>

        {!guide && (
          <div className="text-xs text-gray-500 px-1">Full guide not written yet.</div>
        )}

        {guide && (
          <>
            <Section title="MECHANISM">
              <ul className="flex flex-col gap-1 text-xs text-gray-300">
                {guide.mechanism.map((p, i) => (
                  <li key={i} className={`flex gap-2 ${i === 0 ? 'text-gray-100' : ''}`}>
                    <span className="text-gray-600 flex-shrink-0">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 px-3 py-1.5 border-l-2 border-green-600 bg-green-900/10 text-xs text-green-200 font-medium">
                {guide.invariant}
              </div>
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <Section title="SYMPTOM → CHANGE">
                <ul className="flex flex-col gap-1.5">
                  {guide.symptoms.map((s, i) => (
                    <li key={i} className="flex gap-2 items-start text-xs">
                      <span className={`flex-shrink-0 mt-0.5 px-1.5 rounded text-[9px] font-bold text-white ${PHASE_CLASS[s.phase]}`}>
                        {s.phase.toUpperCase()}
                      </span>
                      <span
                        className={`flex-shrink-0 mt-0.5 w-5 text-center text-sm font-bold ${
                          s.change === 'raise' ? 'text-orange-300' : 'text-blue-300'
                        }`}
                      >
                        {s.change === 'raise' ? '↑' : '↓'}
                      </span>
                      <span className="min-w-0">
                        <span className="text-gray-100">{s.symptom}</span>
                        <span className="block text-[10px] text-gray-500">← {s.because}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="INTERACTS WITH">
                <ul className="flex flex-col gap-1.5">
                  {guide.interactsWith.map((x) => {
                    const other = getParameter(x.id)
                    return (
                      <li key={x.id} className="text-xs">
                        <Link
                          href={`/setups/${x.id}`}
                          className="text-green-400 hover:text-green-300 font-medium"
                        >
                          {other?.name ?? x.id}
                        </Link>
                        <span className="block text-[10px] text-gray-400">{x.how}</span>
                      </li>
                    )
                  })}
                </ul>
              </Section>

              <Section title="TELEMETRY">
                {param.id === 'frontWing' && (
                  <div className="mb-3">
                    <UndersteerGradient />
                  </div>
                )}
                <ul className="flex flex-col gap-1.5">
                  {guide.signals.map((s, i) => (
                    <li key={i} className="text-xs">
                      <span className="text-gray-100 font-medium">{s.channel}</span>
                      <span className="block text-[10px] text-gray-400">{s.look}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              {guide.examples && (
                <Section title="TRACK EXAMPLES">
                  <ul className="flex flex-col gap-2">
                    {guide.examples.map(ex => (
                      <li key={ex.track} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-24 flex-shrink-0 font-medium text-gray-100">{ex.track}</span>
                          {/* where on the range this track sits */}
                          <div className="flex-1 h-1.5 rounded bg-gray-800 relative">
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-gray-900"
                              style={{ left: `${ex.position * 100}%` }}
                            />
                          </div>
                          <span className="w-16 flex-shrink-0 text-right tabular-nums whitespace-nowrap text-gray-200">{ex.value}</span>
                        </div>
                        <div className="ml-[6.5rem] mt-0.5 text-[10px] text-gray-500">
                          <span className="text-gray-400">{ex.character}</span> → {ex.why}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between text-[9px] text-gray-600 tabular-nums">
                    <span>{param.min}{param.unit}</span>
                    <span>{param.max}{param.unit}</span>
                  </div>
                </Section>
              )}

              <Section title="FAILURE MODES">
                <ul className="flex flex-col gap-1.5">
                  {guide.failureModes.map((f, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-300">
                      <span className="text-red-400 flex-shrink-0">✕</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </>
        )}

        <div className="px-1"><ColourLegend /></div>
    </GuideShell>
  )
}
