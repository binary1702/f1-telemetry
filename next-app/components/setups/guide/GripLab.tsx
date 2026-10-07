'use client'

import { useState } from 'react'
import { VIZ } from './palette'

/**
 * Balance = which end lets go first. Two grip sliders, nothing else.
 * The lower one is the axle that slides, and that alone decides
 * understeer vs oversteer. Every setup knob is just a way to move one bar.
 */
// Module-level so React keeps the same element across renders (see BalanceLab for why)
function Bar({ label, value, isWeak, color }: { label: string; value: number; isWeak: boolean; color: string }) {
  return (
    <div className="flex items-center gap-3 text-[10px]">
      <span className="w-20 text-gray-400">{label}</span>
      <div className="flex-1 h-3 rounded bg-gray-800 relative overflow-hidden">
        <div
          className="h-full rounded transition-all duration-150"
          style={{ width: `${value}%`, background: isWeak ? color : VIZ.car, opacity: isWeak ? 1 : 0.5 }}
        />
      </div>
      <span className={`w-16 text-right tabular-nums font-bold ${isWeak ? '' : 'text-gray-400'}`} style={isWeak ? { color } : undefined}>
        {isWeak ? 'lets go first' : ''}
      </span>
    </div>
  )
}

export default function GripLab() {
  const [front, setFront] = useState(70)
  const [rear, setRear] = useState(70)
  const diff = front - rear
  const state = Math.abs(diff) < 5 ? 'neutral' : diff < 0 ? 'understeer' : 'oversteer'
  const color = state === 'neutral' ? VIZ.reference : state === 'understeer' ? VIZ.lower : VIZ.higher
  const weakest = state === 'understeer' ? 'front' : state === 'oversteer' ? 'rear' : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10px]">
        <label className="flex items-center gap-2">
          <span className="text-gray-400 w-16">front grip</span>
          <input type="range" min={30} max={100} value={front} onChange={e => setFront(+e.target.value)} className="w-32 h-4" />
          <span className="tabular-nums font-bold w-6 text-gray-200">{front}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-gray-400 w-16">rear grip</span>
          <input type="range" min={30} max={100} value={rear} onChange={e => setRear(+e.target.value)} className="w-32 h-4" />
          <span className="tabular-nums font-bold w-6 text-gray-200">{rear}</span>
        </label>
      </div>

      <div className="border border-gray-800 rounded p-3 flex flex-col gap-2">
        <Bar label="front grip" value={front} isWeak={weakest === 'front'} color={color} />
        <Bar label="rear grip" value={rear} isWeak={weakest === 'rear'} color={color} />
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-gray-500">lower bar = the end that slides</span>
          <span className="text-sm font-bold tracking-wider" style={{ color }}>{state.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-gray-500">
        <span>↑ both bars → more grip, same balance</span>
        <span>front wing, front ARB, front camber… → move the front bar</span>
        <span>rear wing, diff, rear springs… → move the rear bar</span>
      </div>
    </div>
  )
}
