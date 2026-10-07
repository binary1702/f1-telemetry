/**
 * F1 25 Car Setup - matches the game's garage settings
 * Values come from UDP telemetry packet (carSetups.ts in main app)
 */
export interface F1Setup {
  // Aerodynamics
  frontWing: number
  rearWing: number

  // Transmission (Differential)
  diffOnThrottle: number
  diffOffThrottle: number

  // Suspension Geometry
  frontCamber: number
  rearCamber: number
  frontToe: number
  rearToe: number

  // Suspension
  frontSuspension: number
  rearSuspension: number
  frontAntiRollBar: number
  rearAntiRollBar: number
  frontRideHeight: number
  rearRideHeight: number

  // Brakes
  brakePressure: number
  brakeBias: number

  // Tyres
  frontLeftPressure: number
  frontRightPressure: number
  rearLeftPressure: number
  rearRightPressure: number
}

/**
 * Setup categories for grouping parameters in the UI
 */
export type SetupCategory =
  | 'aerodynamics'
  | 'transmission'
  | 'suspensionGeometry'
  | 'suspension'
  | 'brakes'
  | 'tyres'

/**
 * Category display metadata
 */
export interface SetupCategoryInfo {
  id: SetupCategory
  name: string
  shortName: string
  description: string
}

export const SETUP_CATEGORIES: SetupCategoryInfo[] = [
  {
    id: 'aerodynamics',
    name: 'Aerodynamics',
    shortName: 'AERO',
    description: 'Wing angles control downforce and drag balance'
  },
  {
    id: 'transmission',
    name: 'Transmission',
    shortName: 'DIFF',
    description: 'Differential settings affect how power transfers to wheels'
  },
  {
    id: 'suspensionGeometry',
    name: 'Suspension Geometry',
    shortName: 'GEOM',
    description: 'Camber and toe angles affect tire contact and handling'
  },
  {
    id: 'suspension',
    name: 'Suspension',
    shortName: 'SUSP',
    description: 'Springs and anti-roll bars control weight transfer'
  },
  {
    id: 'brakes',
    name: 'Brakes',
    shortName: 'BRAKE',
    description: 'Brake pressure and front/rear bias'
  },
  {
    id: 'tyres',
    name: 'Tyres',
    shortName: 'TYRE',
    description: 'Tyre pressures affect grip and temperature'
  }
]

/**
 * Car zones: the physical axis for grouping parameters (front → body → rear).
 * Derived from each parameter's carTargets, see getZoneForParameter().
 */
export type CarZone = 'front' | 'body' | 'rear'

export interface CarZoneInfo {
  id: CarZone
  name: string
  shortName: string
  description: string
}

export const CAR_ZONES: CarZoneInfo[] = [
  {
    id: 'front',
    name: 'Front Axle',
    shortName: 'FRONT',
    description: 'Front wing, front suspension, front tyres: turn-in and entry grip'
  },
  {
    id: 'body',
    name: 'Body',
    shortName: 'BODY',
    description: 'Settings that act on the whole car or its balance'
  },
  {
    id: 'rear',
    name: 'Rear Axle',
    shortName: 'REAR',
    description: 'Rear wing, differential, rear suspension, rear tyres: traction and exit'
  }
]

/**
 * Default setup values - mid-range starting point
 */
export const DEFAULT_SETUP: F1Setup = {
  frontWing: 25,
  rearWing: 25,
  diffOnThrottle: 75,
  diffOffThrottle: 75,
  frontCamber: -3.0,
  rearCamber: -1.5,
  frontToe: 0.08,
  rearToe: 0.25,
  frontSuspension: 25,
  rearSuspension: 25,
  frontAntiRollBar: 6,
  rearAntiRollBar: 6,
  frontRideHeight: 25,
  rearRideHeight: 40,
  brakePressure: 100,
  brakeBias: 56,
  frontLeftPressure: 23.5,
  frontRightPressure: 23.5,
  rearLeftPressure: 21.5,
  rearRightPressure: 21.5
}
