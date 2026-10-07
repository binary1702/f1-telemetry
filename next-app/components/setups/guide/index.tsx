import type { ComponentType } from 'react'
import { F1Setup } from '@/types/setup'
import WingLab from './WingLab'
import AeroBalanceLab from './AeroBalanceLab'

/**
 * Parameter-specific interactive visuals. Generic ones (CornerPhaseDiagram,
 * UndersteerGradient) are rendered by the page directly from the definition.
 */
export interface GuideVisual {
  title: string
  /** One line under the title saying what to do with it */
  caption: string
  Component: ComponentType
  /** 'half' visuals share a two-column row with the generic corner diagram */
  width: 'full' | 'half'
}

const FrontWingLab = () => <WingLab axle="front" />
const RearWingLab = () => <WingLab axle="rear" />

const AERO_BALANCE: GuideVisual = {
  title: 'AERO BALANCE · FRONT vs REAR',
  caption: 'Watch the marker, not the numbers.',
  Component: AeroBalanceLab,
  width: 'half'
}

const VISUALS: Partial<Record<keyof F1Setup, GuideVisual[]>> = {
  frontWing: [
    {
      title: 'WING LAB · DOWNFORCE ∝ SPEED²',
      caption: 'Move wing, then speed. Same click: ~0 in a 45 mph hairpin, large in a 155 mph sweeper.',
      Component: FrontWingLab,
      width: 'full'
    },
    AERO_BALANCE
  ],
  rearWing: [
    {
      title: 'WING LAB · DOWNFORCE ∝ SPEED²',
      caption: 'Same physics as the front wing, on the rear tyres. Move wing, then speed.',
      Component: RearWingLab,
      width: 'full'
    },
    AERO_BALANCE
  ]
}

export function getGuideVisuals(id: keyof F1Setup): GuideVisual[] {
  return VISUALS[id] ?? []
}
