'use client'

import { SetupCategoryInfo, F1Setup } from '@/types/setup'
import { getParametersByCategory } from '@/data/setupParameters'
import SetupControl from './SetupControl'

interface SetupCategoryProps {
  category: SetupCategoryInfo
  setup: F1Setup
  selectedParameter: keyof F1Setup | null
  onParameterSelect: (id: keyof F1Setup) => void
  onValueChange: (id: keyof F1Setup, value: number) => void
}

export default function SetupCategory({
  category,
  setup,
  selectedParameter,
  onParameterSelect,
  onValueChange
}: SetupCategoryProps) {
  const parameters = getParametersByCategory(category.id)

  return (
    <div className="border border-gray-700 rounded bg-gray-900/30">
      {/* Compact header */}
      <div className="px-2 py-1 bg-gray-800/50 border-b border-gray-700">
        <span className="text-[10px] text-gray-400 tracking-wider font-bold">
          {category.shortName}
        </span>
      </div>

      {/* Parameters in compact 2-col grid */}
      <div className="p-1 grid grid-cols-2 gap-1">
        {parameters.map((param) => (
          <SetupControl
            key={param.id}
            parameter={param}
            value={setup[param.id]}
            onChange={onValueChange}
            isSelected={selectedParameter === param.id}
            onSelect={() => onParameterSelect(param.id)}
          />
        ))}
      </div>
    </div>
  )
}
