import { VIZ } from './palette'
import { W, H, X0, C, R, HALF, Y1, samplePath, linePath, trackPath, LABELS } from './cornerGeometry'

/**
 * One corner per picture. Dashed line = where you want to go.
 * Solid line = where the car actually goes when it slides.
 *
 * Understeer: you steer in, the car keeps going straighter than you asked,
 * runs wider and wider and leaves the track on the outside at the exit.
 * Oversteer: the rear slides out, the car rotates more and more, and ends
 * up sideways. Both lines are identical on the entry straight: the slide
 * only starts once you turn.
 */

type Kind = 'understeer' | 'oversteer'

// deviation rows: 0 on entry so both lines leave the dashed line at turn-in
const ROW: Record<Kind, [number, number, number]> = {
  understeer: [0, -2, -4],    // wider and wider, runs off at exit (4 × 9 px > half track)
  oversteer: [0, 1, 2]        // tucks in while the car rotates
}
// how far the car body is rotated past the direction of travel, per sample
const YAW: Record<Kind, number[]> = {
  understeer: [-6, -8, -8],       // body nearly follows the wide line
  oversteer: [-15, -40, -70]      // rotates until it is sideways
}
// front wheel steer angle shown on the car, beyond the body
const STEER: Record<Kind, number[]> = {
  understeer: [-28, -34, -34],    // lots of lock, car not answering
  oversteer: [-10, 20, 40]        // opposite lock to catch it
}
const SAMPLE_T = [0.3, 0.6, 0.9]

function Car({ x, y, heading, yaw, steer, kind, ghost }: {
  x: number; y: number; heading: number; yaw: number; steer: number; kind: Kind; ghost?: boolean
}) {
  const color = kind === 'understeer' ? VIZ.lower : VIZ.higher
  const slidingFront = kind === 'understeer'
  const op = ghost ? 0.45 : 1
  return (
    <g transform={`translate(${x} ${y}) rotate(${heading + yaw})`} opacity={op}>
      {/* rear wheels, fixed */}
      <rect x="-13" y="-10" width="7" height="3.5" rx="1" fill={slidingFront ? '#4b5563' : color} />
      <rect x="-13" y="6.5" width="7" height="3.5" rx="1" fill={slidingFront ? '#4b5563' : color} />
      {/* front wheels, steered */}
      <g transform={`translate(9 -8.25) rotate(${steer})`}><rect x="-3.5" y="-1.75" width="7" height="3.5" rx="1" fill={slidingFront ? color : '#4b5563'} /></g>
      <g transform={`translate(9 8.25) rotate(${steer})`}><rect x="-3.5" y="-1.75" width="7" height="3.5" rx="1" fill={slidingFront ? color : '#4b5563'} /></g>
      {/* body */}
      <rect x="-14" y="-6" width="28" height="12" rx="3" fill={VIZ.car} />
      <rect x="9" y="-3" width="5" height="6" fill={VIZ.ink} />
    </g>
  )
}

function Note({ x, y, color, children, anchor = 'start' }: { x: number; y: number; color: string; children: React.ReactNode; anchor?: 'start' | 'end' | 'middle' }) {
  return <text x={x} y={y} fill={color} fontSize="9" fontWeight="bold" textAnchor={anchor}>{children}</text>
}

export function OneCorner({ kind }: { kind: Kind }) {
  const color = kind === 'understeer' ? VIZ.lower : VIZ.higher
  const pts = samplePath(ROW[kind] as never)
  const arc = pts.slice(2, 27)
  const sample = (t: number) => arc[Math.round(t * (arc.length - 1))]
  const cars = SAMPLE_T.map((t, i) => {
    const p = sample(t)
    return <Car key={i} x={p.x} y={p.y} heading={p.heading} yaw={YAW[kind][i]} steer={STEER[kind][i]} kind={kind} ghost={i < 2} />
  })
  const apex = sample(0.6)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Top-down corner showing ${kind}`}>
      <path d={trackPath()} fill={VIZ.track} opacity="0.35" />
      <text x={LABELS.entry.x} y={LABELS.entry.y} fill={VIZ.inkFaint} fontSize="10" textAnchor="middle" letterSpacing="1.5">ENTRY</text>
      <text x={LABELS.apex.x} y={LABELS.apex.y} fill={VIZ.inkFaint} fontSize="10" textAnchor="middle" letterSpacing="1.5">APEX</text>
      <text x={LABELS.exit.x} y={LABELS.exit.y} fill={VIZ.inkFaint} fontSize="10" textAnchor="middle" letterSpacing="1.5"
        transform={`rotate(90 ${LABELS.exit.x} ${LABELS.exit.y})`}>EXIT</text>

      {/* where you want to go */}
      <path d={linePath([0, 0, 0])} fill="none" stroke={VIZ.reference} strokeWidth="2" strokeDasharray="5 4" />
      <text x={X0 + 50} y={C.y + R - 8} fill={VIZ.inkMuted} fontSize="9">where you want to go</text>

      {/* where the car goes */}
      <path d={linePath(ROW[kind] as never)} fill="none" stroke={color} strokeWidth="3" />

      {/* entry car, on the line, no slide yet */}
      <Car x={X0 + 18} y={C.y + R} heading={0} yaw={0} steer={0} kind={kind} ghost />
      {cars}

      {kind === 'understeer' ? (
        <>
          {/* steering arrow at the apex car: toward the inside */}
          <path d={`M${apex.x + 2} ${apex.y - 6} L${apex.x - 10} ${apex.y - 30}`} stroke={VIZ.ink} strokeWidth="1.5" markerEnd="url(#inkhead)" />
          <Note x={apex.x - 14} y={apex.y - 36} color={VIZ.ink} anchor="end">you steer here</Note>
          <Note x={C.x + R - HALF - 8} y={Y1 + 16} color={color} anchor="end">car goes here →</Note>
          <Note x={C.x + R - HALF - 8} y={Y1 + 28} color={color} anchor="end">off the outside</Note>
        </>
      ) : (
        <>
          {/* rear-swing arrow at the apex car */}
          <path d={`M${apex.x - 12} ${apex.y + 4} L${apex.x + 6} ${apex.y + 30}`} stroke={color} strokeWidth="1.5" markerEnd="url(#colorhead)" />
          <Note x={apex.x + 10} y={apex.y + 40} color={color}>rear swings out</Note>
          <Note x={C.x + R - HALF - 6} y={Y1 + 60} color={color} anchor="end">car ends up</Note>
          <Note x={C.x + R - HALF - 6} y={Y1 + 72} color={color} anchor="end">sideways</Note>
        </>
      )}

      <defs>
        <marker id="inkhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill={VIZ.ink} /></marker>
        <marker id="colorhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill={color} /></marker>
      </defs>

      <text x={W - 8} y={H - 8} fill={color} fontSize="12" fontWeight="bold" textAnchor="end" letterSpacing="1">{kind.toUpperCase()}</text>
    </svg>
  )
}

export default function BalanceDiagram() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="border border-gray-800 rounded p-2">
        <OneCorner kind="understeer" />
        <div className="px-1 pt-1 text-[10px] text-gray-400 flex flex-wrap gap-x-4">
          <span>you turn the wheel, the car turns <span className="text-blue-300">less</span></span>
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: VIZ.lower }} />front tyres sliding</span>
        </div>
      </div>
      <div className="border border-gray-800 rounded p-2">
        <OneCorner kind="oversteer" />
        <div className="px-1 pt-1 text-[10px] text-gray-400 flex flex-wrap gap-x-4">
          <span>you turn the wheel, the car turns <span className="text-orange-300">more</span></span>
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: VIZ.higher }} />rear tyres sliding</span>
        </div>
      </div>
    </div>
  )
}
