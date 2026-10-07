/**
 * Semantic car part identifiers
 * These are logical parts of the car, decoupled from GLB mesh names
 */
export type CarPartId =
  | 'front-wing'
  | 'rear-wing'
  | 'front-left-wheel'
  | 'front-right-wheel'
  | 'rear-left-wheel'
  | 'rear-right-wheel'
  | 'front-suspension'
  | 'rear-suspension'
  | 'front-brakes'
  | 'rear-brakes'
  | 'drivetrain'
  | 'chassis'
  | 'floor'

/**
 * Mapping from semantic car part to actual GLB mesh names
 * This is the only place that knows about the 3D model's internal structure
 */
export interface CarPartDefinition {
  id: CarPartId
  label: string
  description: string
  /** Actual mesh names in the GLB file */
  meshNames: string[]
}

/**
 * All semantic car parts with their display info
 * meshNames will be populated after inspecting the actual GLB model
 */
export const CAR_PARTS: CarPartDefinition[] = [
  {
    id: 'front-wing',
    label: 'Front Wing',
    description: 'Front aerodynamic element',
    meshNames: [] // To be populated from GLB inspection
  },
  {
    id: 'rear-wing',
    label: 'Rear Wing',
    description: 'Rear aerodynamic element',
    meshNames: []
  },
  {
    id: 'front-left-wheel',
    label: 'Front Left Wheel',
    description: 'Front left tire and rim',
    meshNames: []
  },
  {
    id: 'front-right-wheel',
    label: 'Front Right Wheel',
    description: 'Front right tire and rim',
    meshNames: []
  },
  {
    id: 'rear-left-wheel',
    label: 'Rear Left Wheel',
    description: 'Rear left tire and rim',
    meshNames: []
  },
  {
    id: 'rear-right-wheel',
    label: 'Rear Right Wheel',
    description: 'Rear right tire and rim',
    meshNames: []
  },
  {
    id: 'front-suspension',
    label: 'Front Suspension',
    description: 'Front suspension arms and geometry',
    meshNames: []
  },
  {
    id: 'rear-suspension',
    label: 'Rear Suspension',
    description: 'Rear suspension arms and geometry',
    meshNames: []
  },
  {
    id: 'front-brakes',
    label: 'Front Brakes',
    description: 'Front brake discs and calipers',
    meshNames: []
  },
  {
    id: 'rear-brakes',
    label: 'Rear Brakes',
    description: 'Rear brake discs and calipers',
    meshNames: []
  },
  {
    id: 'drivetrain',
    label: 'Drivetrain',
    description: 'Transmission and differential',
    meshNames: []
  },
  {
    id: 'chassis',
    label: 'Chassis',
    description: 'Main car body and monocoque',
    meshNames: []
  },
  {
    id: 'floor',
    label: 'Floor',
    description: 'Underbody and floor aerodynamics',
    meshNames: []
  }
]

/**
 * Get a car part definition by ID
 */
export function getCarPart(id: CarPartId): CarPartDefinition | undefined {
  return CAR_PARTS.find(part => part.id === id)
}

/**
 * Get all mesh names for a set of car part IDs
 */
export function getMeshNamesForParts(partIds: CarPartId[]): string[] {
  const meshNames: string[] = []
  for (const partId of partIds) {
    const part = getCarPart(partId)
    if (part) {
      meshNames.push(...part.meshNames)
    }
  }
  return meshNames
}
