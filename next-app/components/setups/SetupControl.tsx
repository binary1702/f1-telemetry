'use client'

import { SetupParameterDefinition } from '@/data/setupParameters'
import { F1Setup } from '@/types/setup'

interface SetupControlProps {
  parameter: SetupParameterDefinition
  value: number
  onChange: (id: keyof F1Setup, value: number) => void
  isSelected?: boolean
  onSelect?: () => void
}

export default function SetupControl({
  parameter,
  value,
  onChange,
  isSelected = false,
  onSelect
}: SetupControlProps) {
  const { id, name, shortName, unit, min, max, step } = parameter

  // Format value for display
  const formatValue = (val: number): string => {
    if (step < 1) {
      return val.toFixed(step < 0.1 ? 2 : 1)
    }
    return Math.round(val).toString()
  }

  return (
    <div
      className={`
        px-2 py-1 rounded border cursor-pointer transition-all
        ${isSelected
          ? 'border-green-500 bg-green-500/10'
          : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'
        }
      `}
      onClick={onSelect}
    >
      {/* Compact single row: label + slider + value */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 tracking-wider w-14 flex-shrink-0">
          {shortName || name.slice(0, 6).toUpperCase()}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(id, parseFloat(e.target.value))}
          className="flex-1 h-4"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-xs font-bold text-white w-12 text-right flex-shrink-0">
          {formatValue(value)}{unit}
        </span>
      </div>
    </div>
  )
}
