import { VIZ } from './palette'

/**
 * The telemetry picture of understeer: steering angle against lateral G.
 * With grip the relation is a straight line. When the front slides, you add
 * steering and lateral G stops answering, so the line bends upward.
 * Static, two series, direct-labelled.
 */
const W = 320, H = 170
const PAD = { l: 36, r: 12, t: 12, b: 26 }
const PW = W - PAD.l - PAD.r
const PH = H - PAD.t - PAD.b
const x = (g: number) => PAD.l + (g / 4) * PW
const y = (deg: number) => PAD.t + (1 - deg / 120) * PH

function pts(fn: (g: number) => number) {
  const out: string[] = []
  for (let g = 0; g <= 3.6; g += 0.2) out.push(`${g === 0 ? 'M' : 'L'}${x(g).toFixed(1)} ${y(fn(g)).toFixed(1)}`)
  return out.join(' ')
}

export default function UndersteerGradient() {
  const grip = (g: number) => g * 22
  const push = (g: number) => (g < 2 ? g * 22 : 44 + (g - 2) * 22 + (g - 2) ** 2 * 18)
  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Steering angle against lateral G for a gripping lap and an understeering lap">
        {[30, 60, 90, 120].map(d => <line key={d} x1={PAD.l} x2={W - PAD.r} y1={y(d)} y2={y(d)} stroke={VIZ.grid} />)}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke={VIZ.inkFaint} />
        {[0, 1, 2, 3, 4].map(g => <text key={g} x={x(g)} y={H - 8} fill={VIZ.inkFaint} fontSize="9" textAnchor="middle">{g}g</text>)}
        <text x={PAD.l - 6} y={y(120) + 3} fill={VIZ.inkFaint} fontSize="9" textAnchor="end">120°</text>
        <text x={PAD.l - 6} y={y(0) + 3} fill={VIZ.inkFaint} fontSize="9" textAnchor="end">0</text>
        <text x={PAD.l - 26} y={PAD.t + PH / 2} fill={VIZ.inkFaint} fontSize="8" textAnchor="middle" transform={`rotate(-90 ${PAD.l - 26} ${PAD.t + PH / 2})`}>steering</text>
        <text x={W - PAD.r} y={H - 8} fill={VIZ.inkFaint} fontSize="8" textAnchor="end" dy="-11">lateral G</text>

        <path d={pts(grip)} fill="none" stroke={VIZ.reference} strokeWidth="2" />
        <path d={pts(push)} fill="none" stroke={VIZ.lower} strokeWidth="2" />

        {/* the gap at 3g: same G, more steering */}
        <line x1={x(3)} x2={x(3)} y1={y(grip(3))} y2={y(push(3))} stroke={VIZ.lower} strokeWidth="1.5" strokeDasharray="2 2" />
        <text x={x(3) + 5} y={(y(grip(3)) + y(push(3))) / 2 + 3} fill={VIZ.inkMuted} fontSize="8">extra steering,</text>
        <text x={x(3) + 5} y={(y(grip(3)) + y(push(3))) / 2 + 13} fill={VIZ.inkMuted} fontSize="8">no extra G</text>

        <text x={x(1.7)} y={y(grip(1.7)) + 14} fill={VIZ.inkMuted} fontSize="8" textAnchor="start">front has grip</text>
        <text x={x(2.3)} y={y(push(2.3)) - 8} fill={VIZ.lower} fontSize="8" textAnchor="end">front sliding</text>
      </svg>
      <div className="flex gap-4 px-1 text-[9px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: VIZ.reference }} />reference lap</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: VIZ.lower }} />understeering lap</span>
      </div>
    </div>
  )
}
