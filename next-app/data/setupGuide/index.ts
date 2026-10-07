import { F1Setup } from '@/types/setup'
import { SetupGuide } from './types'
import { frontWing } from './frontWing'
import { rearWing } from './rearWing'

export type { SetupGuide } from './types'

/** Registry of written guides. A parameter without one still gets a page from its definition. */
const GUIDES: Partial<Record<keyof F1Setup, SetupGuide>> = {
  frontWing,
  rearWing
}

export function getGuide(id: keyof F1Setup): SetupGuide | undefined {
  return GUIDES[id]
}

export function hasGuide(id: keyof F1Setup): boolean {
  return id in GUIDES
}
