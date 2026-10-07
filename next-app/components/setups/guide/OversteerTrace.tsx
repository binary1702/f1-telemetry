import { VIZ } from './palette'

/**
 * The telemetry picture of oversteer: steering angle over time through one
 * corner. A gripping lap is one smooth hump. An oversteering lap crosses
 * zero mid-corner: the driver steers AGAINST the turn to catch the rear.
 * That crossing is called opposite lock.
 */
const W = 320, H = 170
const PAD = { l: 58, r: 12, t: 12, b: 26 }
const PW = W - PAD.l - PAD.r
const PH = H - PAD.t - PAD.b
const x = (t: number) => PAD.l + t * PW                       // t in 0..1
const y = (deg: number) => PAD.t + PH / 2 - (deg / 90) * (PH / 2)  // −90..+90

function pts(fn: (t: number) => number) {
  const out: string[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    out.push(`${i === 0 ? 'M' : 'L'}${x(t).toFixed(1)} ${y(fn(t)).toFixed(1)}`)
  }
  return out.join(' ')
}

export default function OversteerTrace() {
  const grip = (t: number) => 60 * Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 0.1) / 0.8)))
  const slide = (t: number) => {
    if (t < 0.45) return grip(t)
    if (t < 0.7) return grip(0.45) - (t - 0.45) * 420          // snap to opposite lock
    return Math.max(0, -45 + (t - 0.7) * 150)                   // unwind back
  }
  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Steering angle over time for a gripping lap and an oversteering lap">
        {[-60, -30, 30, 60].map(d => <line key={d} x1={PAD.l} x2={W - PAD.r} y1={y(d)} y2={y(d)} stroke={VIZ.grid} />)}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke={VIZ.inkFaint} />
        <text x={PAD.l - 6} y={y(60) + 3} fill={VIZ.inkFaint} fontSize="9" textAnchor="end">into turn</text>
        <text x={PAD.l - 6} y={y(0) + 3} fill={VIZ.inkFaint} fontSize="9" textAnchor="end">0</text>
        <text x={PAD.l - 6} y={y(-60) + 3} fill={VIZ.inkFaint} fontSize="9" textAnchor="end">against</text>
        {['entry', 'apex', 'exit'].map((p, i) => (
          <text key={p} x={x(0.2 + i * 0.3)} y={H - 8} fill={VIZ.inkFaint} fontSize="8" textAnchor="middle">{p}</text>
        ))}
        <text x={W - PAD.r} y={H - 8} fill={VIZ.inkFaint} fontSize="8" textAnchor="end">time →</text>

        <path d={pts(grip)} fill="none" stroke={VIZ.reference} strokeWidth="2" />
        <path d={pts(slide)} fill="none" stroke={VIZ.higher} strokeWidth="2" />

        <text x={x(0.98)} y={y(-62)} fill={VIZ.higher} fontSize="8" textAnchor="end">opposite lock: catching the rear</text>
        <text x={x(0.5)} y={y(66)} fill={VIZ.inkMuted} fontSize="8" textAnchor="middle">one smooth hump = grip</text>
      </svg>
      <div className="flex gap-4 px-1 text-[9px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: VIZ.reference }} />reference lap</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: VIZ.higher }} />oversteering lap</span>
      </div>
    </div>
  )
}
