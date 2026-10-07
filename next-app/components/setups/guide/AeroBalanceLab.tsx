'use client'

import { useState } from 'react'
import { VIZ } from './palette'

/**
 * Balance is relative. Top-down car; the centre of pressure slides toward the
 * axle that carries more downforce. Front share = F / (F + R), with both wings
 * at 25 defined as neutral.
 */
export default function AeroBalanceLab() {
  const [front, setFront] = useState(25)
  const [rear, setRear] = useState(25)

  const total = Math.max(1, front + rear)
  const share = front / total                 // 0..1
  const shift = share - 0.5                   // −0.5..+0.5, + = forward
  // Car drawn nose-left: wheelbase from x=70 (rear) to x=250 (front); neutral at 160
  const cpX = 160 + shift * 180 * 1.6
  const label =
    Math.abs(shift) < 0.03 ? 'neutral'
    : shift > 0 ? 'front grips more → oversteer'
    : 'rear grips more → understeer'
  const color = Math.abs(shift) < 0.03 ? VIZ.reference : shift > 0 ? VIZ.higher : VIZ.lower

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px]">
        <label className="flex items-center gap-2">
          <span className="text-gray-400 w-16">front wing</span>
          <input type="range" min={0} max={50} value={front} onChange={e => setFront(+e.target.value)} className="w-32 h-4" />
          <span className="tabular-nums font-bold w-6 text-gray-200">{front}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-400 w-16">rear wing</span>
          <input type="range" min={0} max={50} value={rear} onChange={e => setRear(+e.target.value)} className="w-32 h-4" />
          <span className="tabular-nums font-bold w-6 text-gray-200">{rear}</span>
        </label>
      </div>

      <div className="border border-gray-800 rounded p-1">
        <svg viewBox="0 0 320 120" className="w-full h-auto max-h-44 mx-auto" role="img" aria-label="Top view of the car with the centre of pressure marker">
          {/* body */}
          <path d="M40 60 L70 48 L150 44 L250 50 L300 56 L300 64 L250 70 L150 76 L70 72 Z" fill={VIZ.car} opacity="0.25" />
          {/* wings */}
          <rect x="268" y="38" width="8" height="44" fill={VIZ.car} opacity="0.5" />
          <rect x="44" y="34" width="8" height="52" fill={VIZ.car} opacity="0.5" />
          {/* wheels */}
          {[[70, 34], [70, 78], [250, 36], [250, 76]].map(([x, y], i) => (
            <rect key={i} x={x - 10} y={y - 4} width="20" height="8" rx="2" fill="#1f2937" stroke={VIZ.car} strokeWidth="1" />
          ))}
          {/* axle labels */}
          <text x="70" y="104" fill={VIZ.inkFaint} fontSize="8" textAnchor="middle">rear axle</text>
          <text x="250" y="104" fill={VIZ.inkFaint} fontSize="8" textAnchor="middle">front axle</text>
          {/* neutral tick */}
          <line x1="160" x2="160" y1="20" y2="100" stroke={VIZ.grid} strokeWidth="1" strokeDasharray="2 2" />
          <text x="160" y="14" fill={VIZ.inkFaint} fontSize="8" textAnchor="middle">neutral</text>
          {/* centre of pressure */}
          <g style={{ transition: 'transform 120ms' }} transform={`translate(${cpX} 0)`}>
            <line x1="0" x2="0" y1="30" y2="90" stroke={color} strokeWidth="2" />
            <circle cx="0" cy="60" r="6" fill={VIZ.surface} stroke={color} strokeWidth="2.5" />
          </g>
          {/* downforce share bars under each axle */}
          <rect x={70 - 20} y="110" width={40 * (1 - share) * 2} height="4" rx="2" fill={VIZ.lower} opacity="0.7" />
          <rect x={250 - 20} y="110" width={40 * share * 2} height="4" rx="2" fill={VIZ.higher} opacity="0.7" />
        </svg>
        <div className="flex items-center justify-between px-1 pt-1 text-[10px]">
          <span className="text-gray-400">front share of downforce</span>
          <span className="tabular-nums font-bold" style={{ color }}>{(share * 100).toFixed(0)}%</span>
        </div>
        <div className="px-1 text-[10px]" style={{ color }}>{label}</div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-gray-500">
        <span>↑ both → marker stays → grip ↑ everywhere, top speed ↓</span>
        <span>↑ one → marker moves → balance shift</span>
      </div>
    </div>
  )
}
