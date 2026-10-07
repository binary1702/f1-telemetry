'use client'

import { useState } from 'react'
import { VIZ } from './palette'

/**
 * Balance at any moment = three things added together:
 *
 *   mechanical   springs, anti-roll bars, camber, toe, pressures   constant
 *   aero         wings, ride height                                 grows with speed²
 *   weight       braking loads the front, throttle loads the rear   depends on phase
 *
 * Sign: + = front has more grip than rear → rear lets go first → oversteer.
 *       − = rear has more → front lets go first → understeer.
 * Left panel: the sum, phase by phase, drawn as stacked arrows.
 * Right panel: the sum against speed, so you can see balance flip.
 */

const V_MAX = 200
const TRANSFER = { entry: 0.35, apex: 0, exit: -0.35 } as const    // braking → +, throttle → −
type Phase = keyof typeof TRANSFER
const PHASES: Phase[] = ['entry', 'apex', 'exit']

const aeroAt = (aeroBias: number, v: number) => aeroBias * (v / V_MAX) ** 2
const total = (mech: number, aero: number, v: number, phase: Phase) => mech + aeroAt(aero, v) + TRANSFER[phase]

const label = (b: number) => Math.abs(b) < 0.12 ? 'neutral' : b > 0 ? 'oversteer' : 'understeer'
const colorOf = (b: number) => Math.abs(b) < 0.12 ? VIZ.reference : b > 0 ? VIZ.higher : VIZ.lower

// ---------- stacked arrows, one row per phase ----------

const BW = 460
const LEFT = 118, RIGHT = 70           // room for push labels on the left, verdict on the right
const MID = LEFT + (BW - LEFT - RIGHT) / 2
const SCALE = 110                      // px per unit of balance
const COLORS = { mech: '#9ca3af', aero: '#c084fc', weight: '#f0abfc' }
const LINE = 11                        // px between the bars inside one phase
const ROW_H = LINE * 4 + 18            // three pushes + the sum, plus a gap

const clamp = (x: number) => Math.max(LEFT + 4, Math.min(BW - RIGHT - 6, x))

/**
 * One push, drawn as a bar from the neutral line. Left = pushes toward
 * understeer, right = toward oversteer. The label says what the push IS.
 */
function Push({ y, value, color, text }: { y: number; value: number; color: string; text: string }) {
  const x = clamp(MID + value * SCALE)
  const tiny = Math.abs(value) < 0.02
  return (
    <g>
      <text x={LEFT - 6} y={y + 3} fill={color} fontSize="8" textAnchor="end">{text}</text>
      {tiny
        ? <circle cx={MID} cy={y} r="1.5" fill={color} opacity="0.6" />
        : <line x1={MID} x2={x} y1={y} y2={y} stroke={color} strokeWidth="6" strokeLinecap="round" />}
    </g>
  )
}

function PhaseRows({ mech, aero, speed }: { mech: number; aero: number; speed: number }) {
  const H = PHASES.length * ROW_H + 26
  return (
    <svg viewBox={`0 0 ${BW} ${H}`} className="w-full h-auto" role="img" aria-label="Three pushes on balance and their sum, for each corner phase">
      <line x1={MID} x2={MID} y1="18" y2={H - 6} stroke={VIZ.inkFaint} strokeDasharray="3 3" />
      <text x={MID} y="11" fill={VIZ.inkFaint} fontSize="8" textAnchor="middle">neutral</text>
      <text x={LEFT} y="11" fill={VIZ.lower} fontSize="8">← understeer</text>
      <text x={BW - RIGHT} y="11" fill={VIZ.higher} fontSize="8" textAnchor="end">oversteer →</text>

      {PHASES.map((p, i) => {
        const top = 24 + i * ROW_H
        const a = aeroAt(aero, speed)
        const t = TRANSFER[p]
        const sum = mech + a + t
        const ySum = top + LINE * 3 + 2
        return (
          <g key={p}>
            <text x="6" y={top + LINE + 3} fill={VIZ.inkMuted} fontSize="9" letterSpacing="1">{p.toUpperCase()}</text>
            <Push y={top} value={mech} color={COLORS.mech} text="springs, bars, tyres" />
            <Push y={top + LINE} value={a} color={COLORS.aero} text="wings" />
            <Push y={top + LINE * 2} value={t} color={COLORS.weight} text={t > 0 ? 'braking' : t < 0 ? 'throttle' : 'no pedal'} />
            {/* the sum: thin rule and a circle where the three pushes net out */}
            <text x={LEFT - 6} y={ySum + 3} fill={VIZ.ink} fontSize="8" textAnchor="end" fontWeight="bold">= balance</text>
            <line x1={MID} x2={clamp(MID + sum * SCALE)} y1={ySum} y2={ySum} stroke={colorOf(sum)} strokeWidth="1.5" />
            <circle cx={clamp(MID + sum * SCALE)} cy={ySum} r="5.5" fill={VIZ.surface} stroke={colorOf(sum)} strokeWidth="2.5" />
            <text x={BW - 6} y={ySum + 3} fill={colorOf(sum)} fontSize="9" fontWeight="bold" textAnchor="end">{label(sum)}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------- balance vs speed ----------

const CW = 420, CH = 170
const PAD = { l: 34, r: 12, t: 14, b: 24 }
const PW = CW - PAD.l - PAD.r, PH = CH - PAD.t - PAD.b
const xOf = (v: number) => PAD.l + (v / V_MAX) * PW
const yOf = (b: number) => PAD.t + PH / 2 - b * (PH / 2) / 1.2

function SpeedChart({ mech, aero, speed }: { mech: number; aero: number; speed: number }) {
  const path = (phase: Phase) => {
    const pts: string[] = []
    for (let v = 0; v <= V_MAX; v += 5) {
      const b = Math.max(-1.2, Math.min(1.2, total(mech, aero, v, phase)))
      pts.push(`${v === 0 ? 'M' : 'L'}${xOf(v).toFixed(1)} ${yOf(b).toFixed(1)}`)
    }
    return pts.join(' ')
  }
  const apexNow = Math.max(-1.2, Math.min(1.2, total(mech, aero, speed, 'apex')))
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full h-auto" role="img" aria-label="Balance against speed for each corner phase">
      <rect x={PAD.l} y={PAD.t} width={PW} height={PH / 2} fill={VIZ.higher} opacity="0.05" />
      <rect x={PAD.l} y={PAD.t + PH / 2} width={PW} height={PH / 2} fill={VIZ.lower} opacity="0.05" />
      <line x1={PAD.l} x2={CW - PAD.r} y1={yOf(0)} y2={yOf(0)} stroke={VIZ.inkFaint} strokeDasharray="3 3" />
      <text x={PAD.l - 4} y={yOf(0.9)} fill={VIZ.higher} fontSize="8" textAnchor="end">OS</text>
      <text x={PAD.l - 4} y={yOf(0) + 3} fill={VIZ.inkFaint} fontSize="8" textAnchor="end">0</text>
      <text x={PAD.l - 4} y={yOf(-0.9)} fill={VIZ.lower} fontSize="8" textAnchor="end">US</text>
      {[0, 50, 100, 150, 200].map(v => (
        <text key={v} x={xOf(v)} y={CH - 8} fill={VIZ.inkFaint} fontSize="9" textAnchor="middle">{v}</text>
      ))}
      <text x={CW - PAD.r} y={CH - 8} fill={VIZ.inkFaint} fontSize="8" textAnchor="end" dy="-11">mph</text>

      <path d={path('entry')} fill="none" stroke={VIZ.inkMuted} strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={path('exit')} fill="none" stroke={VIZ.inkMuted} strokeWidth="1.5" strokeDasharray="1.5 3" />
      <path d={path('apex')} fill="none" stroke={VIZ.ink} strokeWidth="2.5" />

      <line x1={xOf(speed)} x2={xOf(speed)} y1={PAD.t} y2={PAD.t + PH} stroke={VIZ.inkFaint} strokeDasharray="2 2" />
      <circle cx={xOf(speed)} cy={yOf(apexNow)} r="5" fill={VIZ.surface} stroke={colorOf(apexNow)} strokeWidth="2.5" />
    </svg>
  )
}

// ---------- lab ----------

/**
 * Declared at module level on purpose. A component defined inside BalanceLab
 * would be a new type on every render, so React would remount the <input>
 * mid-drag and the slider would stop following the pointer.
 */
function Slider({ label: l, value, set, min, max, step, left, right }: {
  label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; left: string; right: string
}) {
  return (
    <label className="flex items-center gap-2 text-[10px]">
      <span className="text-gray-400 w-24">{l}</span>
      <span className="text-blue-300 w-14 text-right">{left}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(+e.target.value)} className="w-32 h-4" />
      <span className="text-orange-300 w-14">{right}</span>
    </label>
  )
}

export default function BalanceLab() {
  const [mech, setMech] = useState(-0.3)
  const [aero, setAero] = useState(0.6)
  const [speed, setSpeed] = useState(155)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
        <Slider label="springs, bars, tyres" value={mech} set={setMech} min={-1} max={1} step={0.05} left="rear strong" right="front strong" />
        <Slider label="wings" value={aero} set={setAero} min={-1} max={1} step={0.05} left="rear wing" right="front wing" />
        <label className="flex items-center gap-2 text-[10px]">
          <span className="text-gray-400 w-10">speed</span>
          <input type="range" min={0} max={V_MAX} step={5} value={speed} onChange={e => setSpeed(+e.target.value)} className="w-32 h-4" />
          <span className="tabular-nums font-bold w-14 text-gray-200">{speed} mph</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <div className="border border-gray-800 rounded p-2">
          <PhaseRows mech={mech} aero={aero} speed={speed} />
          <div className="flex flex-wrap gap-x-4 px-2 pt-1 text-[9px] text-gray-400">
            <span><span className="inline-block w-3 h-1.5 mr-1" style={{ background: COLORS.mech }} />springs, anti-roll bars, camber, tyres: same push at every speed</span>
            <span><span className="inline-block w-3 h-1.5 mr-1" style={{ background: COLORS.aero }} />wings: push grows with speed²</span>
            <span><span className="inline-block w-3 h-1.5 mr-1" style={{ background: COLORS.weight }} />braking loads the front, throttle loads the rear</span>
          </div>
        </div>
        <div className="border border-gray-800 rounded p-2">
          <SpeedChart mech={mech} aero={aero} speed={speed} />
          <div className="flex flex-wrap gap-x-4 px-2 pt-1 text-[9px] text-gray-400">
            <span><span className="inline-block w-4 border-t-2" style={{ borderColor: VIZ.ink }} />apex</span>
            <span><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: VIZ.inkMuted }} />entry (braking)</span>
            <span><span className="inline-block w-4 border-t-2 border-dotted" style={{ borderColor: VIZ.inkMuted }} />exit (throttle)</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-gray-500">
        <span>default: suspension favours the rear, wings favour the front → understeer in slow corners, oversteer in fast ones. One car, two personalities.</span>
        <span>set wings to the middle → the lines go flat: balance stops changing with speed</span>
      </div>
    </div>
  )
}
