'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { F1Setup, DEFAULT_SETUP, SETUP_CATEGORIES, CAR_ZONES } from '@/types/setup'
import { getParameter, getParametersByZone, SETUP_PARAMETERS, SetupParameterDefinition } from '@/data/setupParameters'
import { CarPartId } from '@/types/car'
import SetupExplanation, { getDirection, formatValue } from './SetupExplanation'

// Dynamically import F1Car to avoid SSR issues with Three.js
const F1Car = dynamic(() => import('@/components/car/F1Car'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900/50 rounded flex items-center justify-center">
      <span className="text-gray-500 text-xs">Loading 3D...</span>
    </div>
  )
})

interface CompactControlProps {
  param: SetupParameterDefinition
  value: number
  baseline: number
  isSelected: boolean
  onSelect: () => void
  onChange: (value: number) => void
}

function CompactControl({ param, value, baseline, isSelected, onSelect, onChange }: CompactControlProps) {
  // Direction from baseline drives the value colour: orange up, blue down, white at baseline
  const direction = getDirection(value, baseline, param.step)
  const valueClass =
    direction === 'higher' ? 'text-orange-300' : direction === 'lower' ? 'text-blue-300' : 'text-white'

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all ${
        isSelected ? 'bg-green-500/20 ring-1 ring-green-500' : 'hover:bg-gray-800'
      }`}
    >
      {/* Label is the way into the guide page; the row body selects */}
      <Link
        href={`/setups/${param.id}`}
        onClick={(e) => e.stopPropagation()}
        title={`${param.name} guide`}
        className="text-[10px] text-gray-400 hover:text-green-400 hover:underline w-16 flex-shrink-0 truncate"
      >
        {param.shortName || param.name.slice(0, 8)}
      </Link>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 h-4"
      />
      <span className="w-20 flex-shrink-0 text-right leading-none">
        <span className={`text-xs font-medium tabular-nums ${valueClass}`}>
          {formatValue(value, param.step, param.unit)}
        </span>
        {direction && (
          <span className="block text-[9px] text-gray-500 tabular-nums">
            was {formatValue(baseline, param.step)}
          </span>
        )}
      </span>
    </div>
  )
}

export default function SetupExplorer() {
  const [setup, setSetup] = useState<F1Setup>(DEFAULT_SETUP)
  const [selectedParameter, setSelectedParameter] = useState<keyof F1Setup | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const selectedParamDef = selectedParameter ? getParameter(selectedParameter) ?? null : null

  const highlightedParts = useMemo<CarPartId[]>(() => {
    if (!selectedParamDef) return []
    return selectedParamDef.carTargets
  }, [selectedParamDef])

  const handleValueChange = (id: keyof F1Setup, value: number) => {
    setSetup(prev => ({ ...prev, [id]: value }))
  }

  const handlePartClick = (partId: CarPartId) => {
    const param = SETUP_PARAMETERS.find(p => p.carTargets.includes(partId))
    if (param) {
      setSelectedParameter(param.id)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  return (
    <div className="h-full flex gap-2 p-2">
      {/* Left: 3D Car - expands when sidebar collapsed */}
      <div className={`flex flex-col gap-2 transition-all duration-300 ${sidebarCollapsed ? 'flex-1' : 'w-[55%]'}`}>
        <div className="flex-1 min-h-0">
          <F1Car
            selectedParts={highlightedParts}
            onPartClick={handlePartClick}
            className="h-full"
          />
        </div>
        <div className="h-28 border border-gray-700 rounded bg-gray-900/50">
          <SetupExplanation
            parameter={selectedParamDef}
            value={selectedParameter ? setup[selectedParameter] : undefined}
            baseline={selectedParameter ? DEFAULT_SETUP[selectedParameter] : undefined}
          />
        </div>
      </div>

      {/* Right: Collapsible Sidebar */}
      <div className={`flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-8' : 'w-[45%]'}`}>
        {/* Collapse toggle button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mb-1 py-0.5 text-[10px] text-gray-600 hover:text-gray-400 flex items-center justify-center transition-colors"
        >
          {sidebarCollapsed ? '◀' : '▶'}
        </button>

        {/* Sidebar content */}
        {!sidebarCollapsed && (
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
            {CAR_ZONES.map((zone) => {
              const params = getParametersByZone(zone.id)
              const isCollapsed = collapsedCategories.has(zone.id)

              // Secondary axis: the system (aero, susp, ...) within this zone
              const bySystem = SETUP_CATEGORIES
                .map(cat => ({ cat, params: params.filter(p => p.category === cat.id) }))
                .filter(g => g.params.length > 0)

              return (
                <div key={zone.id} className="border border-gray-700 rounded bg-gray-900/30 flex-shrink-0">
                  {/* Zone header - clickable to collapse */}
                  <div
                    onClick={() => toggleCategory(zone.id)}
                    className="px-2 py-1.5 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-700/50 transition-colors"
                  >
                    <div>
                      <span className="text-[10px] text-gray-400 tracking-wider font-bold">
                        {zone.shortName}
                      </span>
                      <span className="text-[10px] text-gray-600 ml-2">
                        {zone.name}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                  </div>

                  {/* Parameters grouped by system - collapsible */}
                  {!isCollapsed && (
                    <div className="p-1 flex flex-col gap-0.5">
                      {bySystem.map(({ cat, params: sysParams }) => (
                        <div key={cat.id} className="grid grid-cols-2 gap-0.5">
                          <span className="col-span-2 px-2 pt-1 text-[9px] text-gray-600 tracking-wider">
                            {cat.shortName}
                          </span>
                          {sysParams.map((param) => (
                            <CompactControl
                              key={param.id}
                              param={param}
                              value={setup[param.id]}
                              baseline={DEFAULT_SETUP[param.id]}
                              isSelected={selectedParameter === param.id}
                              onSelect={() => setSelectedParameter(param.id)}
                              onChange={(v) => handleValueChange(param.id, v)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
