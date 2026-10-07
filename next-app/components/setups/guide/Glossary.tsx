import { VIZ } from './palette'

/**
 * The words every guide page uses. Each term: one icon, one line.
 */

type IconKind = 'push' | 'loose' | 'entry' | 'apex' | 'exit' | 'straight' | 'fast' | 'slow' | 'grip' | 'downforce' | 'aero' | 'mechanical' | 'balance' | 'arrows'

export const TERMS: Array<{ term: string; also?: string; plain: string; icon: IconKind; tone?: 'lower' | 'higher' }> = [
  { term: 'understeer', tone: 'lower', icon: 'push', plain: 'Turns less than you steer. Front slides.' },
  { term: 'oversteer', tone: 'higher', icon: 'loose', plain: 'Turns more than you steer. Rear slides.' },
  { term: 'entry', icon: 'entry', plain: 'Braking, turning in.' },
  { term: 'apex', icon: 'apex', plain: 'Middle, tightest point.' },
  { term: 'exit', icon: 'exit', plain: 'On the throttle, unwinding.' },
  { term: 'straight', icon: 'straight', plain: 'No corner. Top speed, braking, tyre temp.' },
  { term: 'fast corner', icon: 'fast', plain: 'Gentle bend, 130+ mph. Copse, Pouhon, Eau Rouge.' },
  { term: 'slow corner', icon: 'slow', plain: 'Tight turn, under 60 mph. Hairpins, chicanes.' },
  { term: 'grip', icon: 'grip', plain: 'How hard a tyre holds before it slides.' },
  { term: 'downforce', icon: 'downforce', plain: 'Air pushing the car down. Only at speed.' },
  { term: 'aero grip', icon: 'aero', plain: 'Grip from the wings and floor. Fast corners only.' },
  { term: 'mechanical grip', icon: 'mechanical', plain: 'Grip from springs, anti-roll bars, camber, tyre pressure. Every speed.' },
  { term: 'balance', icon: 'balance', plain: 'Which end lets go first.' },
  { term: '↑ ↓', icon: 'arrows', plain: 'Slider up or down from where it is.' }
]

// ---------- icons, 64×40 each ----------

const corner = 'M4 34 L28 34 Q46 34 46 16 L46 4'   // small left-to-up right-hander, neutral line
const trackFill = 'M4 40 L28 40 Q52 40 52 16 L52 4 L40 4 L40 16 Q40 28 28 28 L4 28 Z'

function CornerIcon({ phase, lineColor, line }: { phase?: 'entry' | 'apex' | 'exit'; lineColor?: string; line?: string }) {
  return (
    <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
      <path d={trackFill} fill={VIZ.track} opacity="0.35" />
      {phase === 'entry' && <rect x="4" y="28" width="22" height="12" fill={VIZ.ink} opacity="0.25" />}
      {phase === 'apex' && <path d="M26 40 Q52 40 52 14 L40 14 Q40 28 26 28 Z" fill={VIZ.ink} opacity="0.25" />}
      {phase === 'exit' && <rect x="40" y="4" width="12" height="12" fill={VIZ.ink} opacity="0.25" />}
      <path d={corner} fill="none" stroke={VIZ.reference} strokeWidth="2" strokeDasharray="3 2" />
      {line && <path d={line} fill="none" stroke={lineColor} strokeWidth="2.5" />}
    </svg>
  )
}

function Icon({ kind }: { kind: IconKind }) {
  switch (kind) {
    case 'push':
      // runs wide: drifts to the outside of the neutral line
      return <CornerIcon lineColor={VIZ.lower} line="M4 34 L30 34 Q58 34 56 6" />
    case 'loose':
      // rotates: tucks inside, then over-rotates
      return <CornerIcon lineColor={VIZ.higher} line="M4 34 L26 34 Q40 32 38 18 L30 6" />
    case 'entry': return <CornerIcon phase="entry" />
    case 'apex': return <CornerIcon phase="apex" />
    case 'exit': return <CornerIcon phase="exit" />
    case 'fast':
      // wide radius, barely a bend
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <path d="M4 36 Q32 30 60 6 L60 14 Q34 36 4 40 Z" fill={VIZ.track} opacity="0.35" />
          <path d="M4 36 Q32 32 60 8" fill="none" stroke={VIZ.reference} strokeWidth="2" strokeDasharray="3 2" />
          <text x="10" y="12" fill={VIZ.inkFaint} fontSize="8">130+ mph</text>
        </svg>
      )
    case 'slow':
      // hairpin: tight radius, back the way you came
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <path d="M4 10 L36 10 A14 14 0 0 1 36 38 L4 38 L4 30 L36 30 A6 6 0 0 0 36 18 L4 18 Z" fill={VIZ.track} opacity="0.35" />
          <path d="M4 14 L36 14 A10 10 0 0 1 36 34 L4 34" fill="none" stroke={VIZ.reference} strokeWidth="2" strokeDasharray="3 2" />
          <text x="4" y="27" fill={VIZ.inkFaint} fontSize="7">&lt; 60 mph</text>
        </svg>
      )
    case 'straight':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <rect x="4" y="14" width="56" height="12" fill={VIZ.track} opacity="0.35" />
          <path d="M6 20 L56 20" stroke={VIZ.reference} strokeWidth="2" strokeDasharray="3 2" />
          <path d="M50 16 L58 20 L50 24" fill="none" stroke={VIZ.reference} strokeWidth="2" />
        </svg>
      )
    case 'grip':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <line x1="4" y1="32" x2="60" y2="32" stroke={VIZ.track} strokeWidth="2" />
          <circle cx="32" cy="18" r="13" fill="#1f2937" stroke={VIZ.car} strokeWidth="2" />
          <rect x="22" y="29" width="20" height="4" rx="2" fill={VIZ.car} />
          <path d="M14 36 L8 36 M18 36 L12 36" stroke={VIZ.inkMuted} strokeWidth="1.5" />
          <path d="M46 36 L52 36 M50 36 L56 36" stroke={VIZ.inkMuted} strokeWidth="1.5" />
        </svg>
      )
    case 'downforce':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <line x1="4" y1="34" x2="60" y2="34" stroke={VIZ.track} strokeWidth="2" />
          <path d="M10 28 L22 24 L44 22 L58 26 L58 30 L10 30 Z" fill={VIZ.car} opacity="0.7" />
          <path d="M32 4 L32 18 M26 13 L32 19 L38 13" fill="none" stroke={VIZ.higher} strokeWidth="2.5" />
          <path d="M14 4 L14 12 M50 4 L50 12" stroke={VIZ.higher} strokeWidth="1.5" opacity="0.5" />
        </svg>
      )
    case 'aero':
      // side view: wings highlighted, air arrows pressing down
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <line x1="4" y1="34" x2="60" y2="34" stroke={VIZ.track} strokeWidth="2" />
          <path d="M14 28 L24 24 L44 22 L54 26 L54 30 L14 30 Z" fill={VIZ.car} opacity="0.4" />
          <rect x="6" y="27" width="10" height="3" fill={VIZ.higher} />
          <rect x="50" y="18" width="10" height="3" fill={VIZ.higher} />
          <path d="M11 12 L11 24 M55 6 L55 15" stroke={VIZ.higher} strokeWidth="2" />
          <path d="M8 21 L11 25 L14 21 M52 12 L55 16 L58 12" fill="none" stroke={VIZ.higher} strokeWidth="2" />
        </svg>
      )
    case 'mechanical':
      // side view: spring + tyre highlighted
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <line x1="4" y1="34" x2="60" y2="34" stroke={VIZ.track} strokeWidth="2" />
          <path d="M14 20 L24 16 L44 14 L54 18 L54 22 L14 22 Z" fill={VIZ.car} opacity="0.4" />
          <circle cx="40" cy="28" r="6" fill="#1f2937" stroke={VIZ.lower} strokeWidth="2" />
          <path d="M22 22 L26 24 L22 26 L26 28 L22 30 L26 32" fill="none" stroke={VIZ.lower} strokeWidth="2" />
          <line x1="24" y1="32" x2="24" y2="34" stroke={VIZ.lower} strokeWidth="2" />
        </svg>
      )
    case 'balance':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <path d="M8 22 L56 22" stroke={VIZ.car} strokeWidth="2" />
          <path d="M32 22 L26 34 L38 34 Z" fill={VIZ.car} opacity="0.7" />
          <rect x="8" y="12" width="10" height="10" rx="1" fill={VIZ.higher} opacity="0.8" />
          <rect x="46" y="12" width="10" height="10" rx="1" fill={VIZ.lower} opacity="0.8" />
          <text x="13" y="9" fill={VIZ.inkFaint} fontSize="7" textAnchor="middle">R</text>
          <text x="51" y="9" fill={VIZ.inkFaint} fontSize="7" textAnchor="middle">F</text>
        </svg>
      )
    case 'arrows':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 flex-shrink-0">
          <text x="22" y="28" fill={VIZ.higher} fontSize="22" fontWeight="bold" textAnchor="middle">↑</text>
          <text x="42" y="28" fill={VIZ.lower} fontSize="22" fontWeight="bold" textAnchor="middle">↓</text>
        </svg>
      )
  }
}

export function ColourLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-gray-400">
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: VIZ.lower }} />understeer</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: VIZ.higher }} />oversteer</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-dashed" style={{ borderColor: VIZ.reference }} />neutral line</span>
      <span className="text-gray-500">entry → apex → exit → straight</span>
    </div>
  )
}

export default function Glossary() {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {TERMS.map(t => (
        <div key={t.term} className="flex items-center gap-3 border border-gray-800 rounded bg-gray-900/30 px-3 py-2">
          <Icon kind={t.icon} />
          <div className="min-w-0">
            <dt className="flex items-baseline gap-2 text-sm text-gray-100 font-medium">
              {t.term}
              {t.also && <span className="text-[10px] text-gray-500 font-normal">{t.also}</span>}
            </dt>
            <dd className="text-xs text-gray-400">{t.plain}</dd>
          </div>
        </div>
      ))}
    </dl>
  )
}
