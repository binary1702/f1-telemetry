'use client'

import { useState, useMemo } from 'react'
import { VIZ } from './palette'

/**
 * One idea, two views, one state.
 *   downforce = (0.3 + 0.7·angle/50) · (v/200)²
 * Left: side view of the nose with the wing at `angle`, arrows scaled by the
 * formula. Right: downforce vs speed, your angle against the reference 25.
 * Hovering the chart sets the speed, so the crosshair and the arrows agree.
 */

const V_MAX = 200
const REF_ANGLE = 25

function downforce(angle: number, v: number) {
  return (0.3 + 0.7 * (angle / 50)) * (v / V_MAX) ** 2
}
function drag(angle: number, v: number) {
  return (0.2 + 0.8 * (angle / 50)) * (v / V_MAX) ** 2
}

// ---------- side view ----------

export type WingAxle = 'front' | 'rear'

function SideView({ angle, speed, axle }: { angle: number; speed: number; axle: WingAxle }) {
  const df = downforce(angle, speed)
  const dr = drag(angle, speed)
  // Wing element: rotate about its trailing edge; 0..50 → 4°..26°
  const wingDeg = 4 + (angle / 50) * 22
  const dfLen = 10 + df * 70
  const drLen = 6 + dr * 50
  const color = angle === REF_ANGLE ? VIZ.reference : angle > REF_ANGLE ? VIZ.higher : VIZ.lower

  if (axle === 'rear') {
    // Car drawn nose-left as before; the rear wing sits high at the right on a pylon
    return (
      <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="Side view of the rear wing with downforce and drag arrows">
        <line x1="0" y1="118" x2="240" y2="118" stroke={VIZ.track} strokeWidth="2" />
        <g stroke={VIZ.inkFaint} strokeWidth="1" opacity="0.6">
          <line x1="20" y1="40" x2="60" y2="40" markerEnd="url(#airhead)" />
          <line x1="20" y1="60" x2="55" y2="60" markerEnd="url(#airhead)" />
        </g>
        <text x="20" y="32" fill={VIZ.inkFaint} fontSize="8">air</text>
        <defs>
          <marker id="airhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={VIZ.inkFaint} />
          </marker>
          <marker id="forcehead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={color} />
          </marker>
        </defs>

        {/* chassis: nose off-canvas left, engine cover rising to the rear */}
        <path d="M0 100 L40 96 L90 88 L130 70 L170 66 L190 80 L190 100 Z" fill={VIZ.car} opacity="0.85" />
        {/* rear wheel */}
        <circle cx="160" cy="100" r="18" fill="#1f2937" stroke={VIZ.car} strokeWidth="2" />
        <circle cx="160" cy="100" r="7" fill={VIZ.car} opacity="0.6" />
        {/* pylon + endplate */}
        <rect x="178" y="52" width="3" height="30" fill={VIZ.car} opacity="0.7" />
        <rect x="214" y="40" width="3" height="26" fill={VIZ.car} opacity="0.7" />

        {/* wing element, rotated about its trailing edge at (216,56) */}
        <g transform={`rotate(${-wingDeg} 216 56)`}>
          <path d="M166 54 L216 52 L216 58 L168 60 Z" fill={color} />
        </g>

        {/* downforce arrow: from the wing, straight down behind the wheel */}
        <line
          x1="200" y1="66" x2="200" y2={66 + dfLen}
          stroke={color} strokeWidth="2.5" markerEnd="url(#forcehead)"
          style={{ transition: 'all 120ms' }}
        />
        <text x="196" y={72 + dfLen / 2} fill={VIZ.inkMuted} fontSize="8" textAnchor="end">downforce</text>

        {/* drag arrow: backwards, against travel */}
        <line
          x1="190" y1="46" x2={190 + drLen} y2="46"
          stroke={color} strokeWidth="2.5" markerEnd="url(#forcehead)"
          style={{ transition: 'all 120ms' }}
        />
        <text x="190" y="40" fill={VIZ.inkMuted} fontSize="8">drag</text>

        <text x="40" y="140" fill={VIZ.inkFaint} fontSize="8">← travel</text>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 240 150" className="w-full h-auto" role="img" aria-label="Side view of the nose and front wing with downforce and drag arrows">
      {/* ground */}
      <line x1="0" y1="118" x2="240" y2="118" stroke={VIZ.track} strokeWidth="2" />
      {/* air direction */}
      <g stroke={VIZ.inkFaint} strokeWidth="1" opacity="0.6">
        <line x1="20" y1="60" x2="60" y2="60" markerEnd="url(#airhead)" />
        <line x1="20" y1="80" x2="55" y2="80" markerEnd="url(#airhead)" />
      </g>
      <text x="20" y="52" fill={VIZ.inkFaint} fontSize="8">air</text>
      <defs>
        <marker id="airhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill={VIZ.inkFaint} />
        </marker>
        <marker id="forcehead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill={color} />
        </marker>
      </defs>

      {/* nose + chassis, simplified */}
      <path
        d="M70 100 L120 96 L200 70 L240 66 L240 100 Z"
        fill={VIZ.car} opacity="0.85"
      />
      {/* front wheel */}
      <circle cx="170" cy="100" r="18" fill="#1f2937" stroke={VIZ.car} strokeWidth="2" />
      <circle cx="170" cy="100" r="7" fill={VIZ.car} opacity="0.6" />

      {/* wing element, rotated about its trailing edge at (112,108) */}
      <g transform={`rotate(${-wingDeg} 112 108)`}>
        <path d="M60 106 L112 104 L112 110 L62 112 Z" fill={color} />
      </g>
      {/* endplate */}
      <rect x="58" y="92" width="3" height="22" fill={VIZ.car} opacity="0.7" />

      {/* downforce arrow: from the wing, straight down */}
      <line
        x1="88" y1="116" x2="88" y2={116 + dfLen}
        stroke={color} strokeWidth="2.5" markerEnd="url(#forcehead)"
        style={{ transition: 'all 120ms' }}
      />
      <text x="94" y={122 + dfLen / 2} fill={VIZ.inkMuted} fontSize="8">downforce</text>

      {/* drag arrow: from the wing, backwards (toward +x, against travel) */}
      <line
        x1="100" y1="100" x2={100 + drLen} y2="100"
        stroke={color} strokeWidth="2.5" markerEnd="url(#forcehead)"
        style={{ transition: 'all 120ms' }}
      />
      <text x="100" y="94" fill={VIZ.inkMuted} fontSize="8">drag</text>

      {/* travel direction */}
      <text x="150" y="140" fill={VIZ.inkFaint} fontSize="8">← travel</text>
    </svg>
  )
}

// ---------- chart ----------

const W = 420, H = 190
const PAD = { l: 34, r: 12, t: 14, b: 26 }
const PW = W - PAD.l - PAD.r
const PH = H - PAD.t - PAD.b

const xOf = (v: number) => PAD.l + (v / V_MAX) * PW
const yOf = (d: number) => PAD.t + (1 - d) * PH

function pathFor(angle: number) {
  const pts: string[] = []
  for (let v = 0; v <= V_MAX; v += 5) {
    pts.push(`${v === 0 ? 'M' : 'L'}${xOf(v).toFixed(1)} ${yOf(downforce(angle, v)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function Chart({
  angle, speed, onSpeed, axle
}: { angle: number; speed: number; onSpeed: (v: number) => void; axle: WingAxle }) {
  const refPath = useMemo(() => pathFor(REF_ANGLE), [])
  const yourPath = useMemo(() => pathFor(angle), [angle])
  const color = angle > REF_ANGLE ? VIZ.higher : angle < REF_ANGLE ? VIZ.lower : VIZ.reference

  const dRef = downforce(REF_ANGLE, speed)
  const dYou = downforce(angle, speed)
  const gap = dYou - dRef
  const cx = xOf(speed)

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    const v = Math.round(Math.max(0, Math.min(V_MAX, ((x - PAD.l) / PW) * V_MAX)) / 5) * 5
    onSpeed(v)
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto cursor-crosshair select-none"
      onMouseMove={handleMove}
      role="img"
      aria-label="Downforce against speed for your wing angle and the reference angle"
    >
      {/* grid: recessive */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={yOf(f)} y2={yOf(f)} stroke={VIZ.grid} strokeWidth="1" />
      ))}
      {/* axes */}
      <line x1={PAD.l} x2={W - PAD.r} y1={yOf(0)} y2={yOf(0)} stroke={VIZ.inkFaint} strokeWidth="1" />
      {[0, 50, 100, 150, 200].map(v => (
        <text key={v} x={xOf(v)} y={H - 8} fill={VIZ.inkFaint} fontSize="9" textAnchor="middle">{v}</text>
      ))}
      <text x={W - PAD.r} y={H - 8} fill={VIZ.inkFaint} fontSize="8" textAnchor="end" dy="-11">mph</text>
      <text x={PAD.l - 6} y={yOf(1) + 3} fill={VIZ.inkFaint} fontSize="9" textAnchor="end">max</text>
      <text x={PAD.l - 6} y={yOf(0) + 3} fill={VIZ.inkFaint} fontSize="9" textAnchor="end">0</text>
      <text
        x={PAD.l - 24} y={PAD.t + PH / 2} fill={VIZ.inkFaint} fontSize="8"
        textAnchor="middle" transform={`rotate(-90 ${PAD.l - 24} ${PAD.t + PH / 2})`}
      >
        {axle} downforce
      </text>

      {/* slow / fast corner bands, with a real corner named so "fast" means something */}
      <rect x={xOf(30)} width={xOf(60) - xOf(30)} y={PAD.t} height={PH} fill={VIZ.ink} opacity="0.04" />
      <rect x={xOf(130)} width={xOf(180) - xOf(130)} y={PAD.t} height={PH} fill={VIZ.ink} opacity="0.04" />
      <text x={xOf(45)} y={PAD.t + 10} fill={VIZ.inkFaint} fontSize="8" textAnchor="middle">hairpin</text>
      <text x={xOf(45)} y={PAD.t + 19} fill={VIZ.inkFaint} fontSize="7" textAnchor="middle">30–60 mph</text>
      <text x={xOf(155)} y={PAD.t + 10} fill={VIZ.inkFaint} fontSize="8" textAnchor="middle">fast sweeper</text>
      <text x={xOf(155)} y={PAD.t + 19} fill={VIZ.inkFaint} fontSize="7" textAnchor="middle">130–180 mph · Copse</text>

      {/* series */}
      <path d={refPath} fill="none" stroke={VIZ.reference} strokeWidth="2" strokeDasharray="4 3" />
      <path d={yourPath} fill="none" stroke={color} strokeWidth="2" style={{ transition: 'd 120ms' }} />

      {/* crosshair + gap */}
      <line x1={cx} x2={cx} y1={PAD.t} y2={yOf(0)} stroke={VIZ.inkFaint} strokeWidth="1" strokeDasharray="2 2" />
      <line x1={cx} x2={cx} y1={yOf(dRef)} y2={yOf(dYou)} stroke={color} strokeWidth="2" />
      <circle cx={cx} cy={yOf(dRef)} r="4" fill={VIZ.surface} stroke={VIZ.reference} strokeWidth="2" />
      <circle cx={cx} cy={yOf(dYou)} r="4" fill={VIZ.surface} stroke={color} strokeWidth="2" />

      {/* tooltip */}
      <g transform={`translate(${cx > W / 2 ? cx - 118 : cx + 8}, ${PAD.t + 16})`}>
        <rect width="110" height="46" rx="3" fill="#0b0b0b" stroke={VIZ.grid} />
        <text x="6" y="12" fill={VIZ.ink} fontSize="9" fontWeight="bold">{speed} mph</text>
        <circle cx="9" cy="24" r="3" fill={VIZ.reference} />
        <text x="16" y="27" fill={VIZ.inkMuted} fontSize="9">wing {REF_ANGLE}: {(dRef * 100).toFixed(0)}</text>
        <circle cx="9" cy="37" r="3" fill={color} />
        <text x="16" y="40" fill={VIZ.inkMuted} fontSize="9">
          wing {angle}: {(dYou * 100).toFixed(0)}
          <tspan fill={VIZ.ink} fontWeight="bold"> ({gap >= 0 ? '+' : ''}{(gap * 100).toFixed(0)})</tspan>
        </text>
      </g>
    </svg>
  )
}

// ---------- lab ----------

export default function WingLab({ axle = 'front' }: { axle?: WingAxle }) {
  const [angle, setAngle] = useState(40)
  const [speed, setSpeed] = useState(155)
  const color = angle > REF_ANGLE ? VIZ.higher : angle < REF_ANGLE ? VIZ.lower : VIZ.reference

  const gapSlow = (downforce(angle, 45) - downforce(REF_ANGLE, 45)) * 100
  const gapFast = (downforce(angle, 155) - downforce(REF_ANGLE, 155)) * 100

  return (
    <div className="flex flex-col gap-2">
      {/* controls in one row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px]">
        <label className="flex items-center gap-2">
          <span className="text-gray-400 w-16">{axle} wing</span>
          <input type="range" min={0} max={50} step={1} value={angle} onChange={e => setAngle(+e.target.value)} className="w-32 h-4" />
          <span className="tabular-nums font-bold w-6" style={{ color }}>{angle}</span>
          <span className="text-gray-600">vs reference {REF_ANGLE}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-400 w-10">speed</span>
          <input type="range" min={0} max={V_MAX} step={5} value={speed} onChange={e => setSpeed(+e.target.value)} className="w-32 h-4" />
          <span className="tabular-nums font-bold w-14 text-gray-200">{speed} mph</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-3 items-start">
        <div className="border border-gray-800 rounded p-2">
          <SideView angle={angle} speed={speed} axle={axle} />
        </div>
        <div className="border border-gray-800 rounded p-2">
          <Chart angle={angle} speed={speed} onSpeed={setSpeed} axle={axle} />
          {/* legend: 2 series, always present */}
          <div className="flex gap-4 px-2 pt-1 text-[9px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: VIZ.reference }} />
              reference, wing {REF_ANGLE}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 border-t-2" style={{ borderColor: color }} />
              your wing, {angle}
            </span>
          </div>
        </div>
      </div>

      {/* the readout that makes the point */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="border border-gray-800 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-gray-500">hairpin · 45 mph</span>
          <span className="text-lg font-bold tabular-nums" style={{ color }}>
            {gapSlow >= 0 ? '+' : ''}{gapSlow.toFixed(1)}
          </span>
        </div>
        <div className="border border-gray-800 rounded px-3 py-2 flex items-center justify-between">
          <span className="text-gray-500">
            fast sweeper · 155 mph
            {Math.abs(gapSlow) > 0.05 && <span className="ml-2 text-gray-400">{(gapFast / gapSlow).toFixed(0)}×</span>}
          </span>
          <span className="text-lg font-bold tabular-nums" style={{ color }}>
            {gapFast >= 0 ? '+' : ''}{gapFast.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  )
}
