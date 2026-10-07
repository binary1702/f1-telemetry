'use client'

import Link from 'next/link'
import { SetupParameterDefinition, getAxleForParameter, describeShift } from '@/data/setupParameters'
import BalanceMatrix, { Direction } from './BalanceMatrix'

interface SetupExplanationProps {
  parameter: SetupParameterDefinition | null
  /** Current slider value */
  value?: number
  /** Reference value the delta is measured from (default setup, or a loaded one) */
  baseline?: number
}

const AXLE_LABEL = { front: 'FRONT AXLE', rear: 'REAR AXLE', both: 'BOTH AXLES' } as const

/** Sign of value − baseline, tolerant of float drift from the range input */
export function getDirection(value: number, baseline: number, step: number): Direction | undefined {
  const delta = value - baseline
  if (Math.abs(delta) < step / 2) return undefined
  return delta > 0 ? 'higher' : 'lower'
}

export function formatValue(val: number, step: number, unit = ''): string {
  const digits = step < 1 ? (step < 0.1 ? 2 : 1) : 0
  return `${val.toFixed(digits)}${unit}`
}

/** "25 → 50": the game shows absolute values, so the change is shown as from → to */
export function formatChange(baseline: number, value: number, step: number, unit = ''): string {
  return `${formatValue(baseline, step, unit)} → ${formatValue(value, step, unit)}`
}

export default function SetupExplanation({ parameter, value, baseline }: SetupExplanationProps) {
  if (!parameter) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-xs">
        Click a setting or car part to learn about it
      </div>
    )
  }

  const hasDelta = value !== undefined && baseline !== undefined
  const direction = hasDelta ? getDirection(value, baseline, parameter.step) : undefined

  return (
    <div className="h-full flex items-center gap-4 px-3">
      {/* Name + mechanism, and the live consequence of the current slider position */}
      <div className="flex-shrink-0 w-60">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/setups/${parameter.id}`}
            title={`${parameter.name} guide`}
            className="text-sm font-bold text-white hover:text-green-400 whitespace-nowrap"
          >
            {parameter.name}
            <span className="ml-1 text-[10px] font-normal text-gray-500">→</span>
          </Link>
          <span className="text-[8px] text-gray-500 tracking-wider">
            {AXLE_LABEL[getAxleForParameter(parameter)]}
          </span>
          {direction && hasDelta && (
            <span className="ml-auto text-[10px] tabular-nums whitespace-nowrap">
              <span className="text-gray-500">{formatValue(baseline, parameter.step, parameter.unit)}</span>
              <span className="text-gray-500 mx-1">→</span>
              <span className={`font-bold ${direction === 'higher' ? 'text-orange-300' : 'text-blue-300'}`}>
                {formatValue(value, parameter.step, parameter.unit)}
              </span>
            </span>
          )}
        </div>
        {direction ? (
          <div className="mt-0.5 text-[10px] leading-snug text-gray-200">
            {describeShift(parameter, direction) || 'no balance change'}
          </div>
        ) : (
          <div className="mt-0.5 text-[10px] leading-snug text-gray-400">
            {parameter.mechanism}
          </div>
        )}
      </div>

      {/* Balance shift per phase; the row matching the slider direction stays lit */}
      <div className="flex-1 min-w-0">
        <BalanceMatrix param={parameter} direction={direction} />
      </div>
    </div>
  )
}
