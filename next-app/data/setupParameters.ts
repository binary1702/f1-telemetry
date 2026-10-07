import { SetupCategory, CarZone, F1Setup } from '@/types/setup'
import { CarPartId } from '@/types/car'

// ============================================================
// Primitives
// ============================================================

/** Where in the corner an effect shows up */
export type CornerPhase = 'entry' | 'apex' | 'exit'
export const CORNER_PHASES: CornerPhase[] = ['entry', 'apex', 'exit']

/**
 * Balance shift. Negative = understeer (front loses relative grip, pushes
 * wide). Positive = oversteer (rear loses relative grip, car rotates).
 * Magnitude 2 is the setting's primary effect, 1 is secondary, 0 is none.
 */
export type Balance = -2 | -1 | 0 | 1 | 2

/** One row of the matrix: balance shift at [entry, apex, exit] */
export type BalanceRow = [Balance, Balance, Balance]

/** Which end of the car the knob physically acts on */
export type Axle = 'front' | 'rear' | 'both'

/**
 * Non-handling cost outside the corner. A closed vocabulary, not free text:
 * `short` is what the matrix cell shows and is capped at 11 characters so the
 * fixed cell geometry can never be overflowed by a new entry. `long` is what
 * the generated sentence uses.
 */
export type StraightCost =
  | 'topSpeedDown' | 'topSpeedUp'
  | 'wheelScrub' | 'wheelSpin'
  | 'brakingGripUp' | 'edgeHot' | 'lineTractionUp'
  | 'scrub' | 'noScrub'
  | 'kerbGripDown' | 'kerbGripUp'
  | 'noScrape' | 'scrapeRisk'
  | 'shortStop' | 'longStop'
  | 'frontLock' | 'rearLock'
  | 'runsCool' | 'runsHot'

type ShortLabel<S extends string> = S extends `${infer _A}${infer _B}${infer _C}${infer _D}${infer _E}${infer _F}${infer _G}${infer _H}${infer _I}${infer _J}${infer _K}${infer _L}${string}`
  ? never  // 12+ characters: rejected at compile time
  : S

function label<S extends string>(short: S & ShortLabel<S>, long: string) {
  return { short, long } as { short: string; long: string }
}

export const STRAIGHT_LABEL: Record<StraightCost, { short: string; long: string }> = {
  topSpeedDown:   label('top speed ↓', 'lower top speed'),
  topSpeedUp:     label('top speed ↑', 'higher top speed'),
  wheelScrub:     label('wheel scrub', 'inside wheel scrubs under power'),
  wheelSpin:      label('wheel spin',  'inside wheel spins under power'),
  brakingGripUp:  label('braking ↑',   'more grip braking in a straight line'),
  edgeHot:        label('edge hot',    'inner edge of the tyre runs hot'),
  lineTractionUp: label('traction ↑',  'more traction in a straight line'),
  scrub:          label('scrub',       'tyres scrub and warm up on the straight'),
  noScrub:        label('no scrub',    'less scrub, tyres stay cooler'),
  kerbGripDown:   label('kerbs ↓',     'less grip over kerbs and bumps'),
  kerbGripUp:     label('kerbs ↑',     'more grip over kerbs and bumps'),
  noScrape:       label('no scrape',   'floor clears the track over bumps'),
  scrapeRisk:     label('scrape risk', 'floor can scrape over bumps'),
  shortStop:      label('stops short', 'shorter stopping distance, lock risk'),
  longStop:       label('stops long',  'longer stopping distance, forgiving'),
  frontLock:      label('front lock',  'front wheels lock first'),
  rearLock:       label('rear lock',   'rear wheels lock first'),
  runsCool:       label('runs cool',   'tyre runs cool, less wear'),
  runsHot:        label('runs hot',    'tyre runs hot, more grip')
}

/**
 * Complete definition of a setup parameter.
 * Separates the value (in F1Setup) from knowledge about that value.
 *
 * Every parameter is one instance of the same chain:
 *   knob → grip at an axle → balance shift → visible in a phase, at a cost
 * `higher` encodes that chain. `lower` is the mirror unless overridden.
 */
export interface SetupParameterDefinition {
  /** Key in F1Setup object */
  id: keyof F1Setup
  /** System this belongs to (aero, suspension, ...) */
  category: SetupCategory
  /** Full display name */
  name: string
  /** Abbreviated name for compact UI */
  shortName?: string
  /** Unit of measurement */
  unit?: string
  min: number
  max: number
  step: number
  /** Whether the range is verified from F1 25 or estimated */
  rangeVerified: boolean
  /** Which car parts this setting affects visually */
  carTargets: CarPartId[]
  /** Explicit zone; overrides the carTargets-derived zone in getZoneForParameter() */
  zone?: CarZone

  /** ONE sentence of physics. Same voice for all parameters. */
  mechanism: string
  /** What a higher slider value physically means, when not obvious ("less camber") */
  higherMeans?: string
  /** What a lower slider value physically means */
  lowerMeans?: string
  /** Balance shift at [entry, apex, exit] when the value goes UP */
  higher: BalanceRow
  /** Balance shift when the value goes DOWN. Default: negation of `higher`. */
  lower?: BalanceRow
  /** Non-handling cost outside the corner, from the closed StraightCost vocabulary */
  straight?: { higher: StraightCost; lower: StraightCost }
}

// ============================================================
// Definitions
// ============================================================

export const SETUP_PARAMETERS: SetupParameterDefinition[] = [
  // ============ AERODYNAMICS ============
  {
    id: 'frontWing',
    category: 'aerodynamics',
    name: 'Front Wing',
    shortName: 'F.WING',
    unit: '',
    min: 0,
    max: 50,
    step: 1,
    rangeVerified: true,
    carTargets: ['front-wing'],
    mechanism: 'Wing angle sets front downforce, so front grip scales with speed.',
    higher: [2, 1, 0],
    straight: { higher: 'topSpeedDown', lower: 'topSpeedUp' }
  },
  {
    id: 'rearWing',
    category: 'aerodynamics',
    name: 'Rear Wing',
    shortName: 'R.WING',
    unit: '',
    min: 0,
    max: 50,
    step: 1,
    rangeVerified: true,
    carTargets: ['rear-wing'],
    mechanism: 'Wing angle sets rear downforce, so rear grip scales with speed.',
    higher: [-1, -1, -2],
    straight: { higher: 'topSpeedDown', lower: 'topSpeedUp' }
  },

  // ============ TRANSMISSION ============
  {
    id: 'diffOnThrottle',
    category: 'transmission',
    name: 'Diff On Throttle',
    shortName: 'DIFF ON',
    unit: '%',
    min: 50,
    max: 100,
    step: 1,
    rangeVerified: true,
    carTargets: ['drivetrain', 'rear-left-wheel', 'rear-right-wheel'],
    mechanism: 'Lock on power: how hard the rear wheels are forced to spin together when you accelerate.',
    higherMeans: 'more locked',
    lowerMeans: 'more open',
    higher: [0, 0, -2],
    straight: { higher: 'wheelScrub', lower: 'wheelSpin' }
  },
  {
    id: 'diffOffThrottle',
    category: 'transmission',
    name: 'Diff Off Throttle',
    shortName: 'DIFF OFF',
    unit: '%',
    min: 50,
    max: 100,
    step: 1,
    rangeVerified: true,
    carTargets: ['drivetrain', 'rear-left-wheel', 'rear-right-wheel'],
    mechanism: 'Lock off power: how freely the rear wheels can differ when you lift or brake.',
    higherMeans: 'more locked',
    lowerMeans: 'more open',
    higher: [-1, 0, 0]
  },

  // ============ SUSPENSION GEOMETRY ============
  {
    id: 'frontCamber',
    category: 'suspensionGeometry',
    name: 'Front Camber',
    shortName: 'F.CAMBER',
    unit: '°',
    min: -3.5,
    max: -2.5,
    step: 0.1,
    rangeVerified: true,
    carTargets: ['front-left-wheel', 'front-right-wheel'],
    mechanism: 'Inward tilt of the front tyre; more tilt keeps the tread flat as the car rolls.',
    higherMeans: 'less tilt',
    lowerMeans: 'more tilt',
    higher: [0, -1, 0],
    straight: { higher: 'brakingGripUp', lower: 'edgeHot' }
  },
  {
    id: 'rearCamber',
    category: 'suspensionGeometry',
    name: 'Rear Camber',
    shortName: 'R.CAMBER',
    unit: '°',
    min: -2.0,
    max: -1.0,
    step: 0.1,
    rangeVerified: true,
    carTargets: ['rear-left-wheel', 'rear-right-wheel'],
    mechanism: 'Inward tilt of the rear tyre; more tilt keeps the tread flat as the car rolls.',
    higherMeans: 'less tilt',
    lowerMeans: 'more tilt',
    higher: [0, 1, 1],
    straight: { higher: 'lineTractionUp', lower: 'edgeHot' }
  },
  {
    id: 'frontToe',
    category: 'suspensionGeometry',
    name: 'Front Toe',
    shortName: 'F.TOE',
    unit: '°',
    min: 0.0,
    max: 0.15,
    step: 0.01,
    rangeVerified: true,
    carTargets: ['front-left-wheel', 'front-right-wheel'],
    mechanism: 'Front wheels angled outward; the inside wheel points into the corner earlier.',
    higherMeans: 'more toe-out',
    lowerMeans: 'less toe-out',
    higher: [1, 0, 0],
    straight: { higher: 'scrub', lower: 'noScrub' }
  },
  {
    id: 'rearToe',
    category: 'suspensionGeometry',
    name: 'Rear Toe',
    shortName: 'R.TOE',
    unit: '°',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    rangeVerified: true,
    carTargets: ['rear-left-wheel', 'rear-right-wheel'],
    mechanism: 'Rear wheels angled inward; the outside rear is already steering into the corner.',
    higherMeans: 'more toe-in',
    lowerMeans: 'less toe-in',
    higher: [-1, 0, -1],
    straight: { higher: 'scrub', lower: 'noScrub' }
  },

  // ============ SUSPENSION ============
  {
    id: 'frontSuspension',
    category: 'suspension',
    name: 'Front Suspension',
    shortName: 'F.SUSP',
    unit: '',
    min: 1,
    max: 50,
    step: 1,
    rangeVerified: false,
    carTargets: ['front-suspension'],
    mechanism: 'Front spring rate; stiffer resists dive and roll but passes bumps straight to the tyre.',
    higherMeans: 'stiffer',
    lowerMeans: 'softer',
    higher: [1, -1, 0],
    straight: { higher: 'kerbGripDown', lower: 'kerbGripUp' }
  },
  {
    id: 'rearSuspension',
    category: 'suspension',
    name: 'Rear Suspension',
    shortName: 'R.SUSP',
    unit: '',
    min: 1,
    max: 50,
    step: 1,
    rangeVerified: false,
    carTargets: ['rear-suspension'],
    mechanism: 'Rear spring rate; stiffer resists squat but loses traction over bumps.',
    higherMeans: 'stiffer',
    lowerMeans: 'softer',
    higher: [0, 1, 1],
    straight: { higher: 'kerbGripDown', lower: 'kerbGripUp' }
  },
  {
    id: 'frontAntiRollBar',
    category: 'suspension',
    name: 'Front Anti-Roll Bar',
    shortName: 'F.ARB',
    unit: '',
    min: 1,
    max: 11,
    step: 1,
    rangeVerified: true,
    carTargets: ['front-suspension', 'chassis'],
    mechanism: 'Front roll stiffness; stiffer loads the outside front faster, taking grip from that axle.',
    higherMeans: 'stiffer',
    lowerMeans: 'softer',
    higher: [-1, -2, 0]
  },
  {
    id: 'rearAntiRollBar',
    category: 'suspension',
    name: 'Rear Anti-Roll Bar',
    shortName: 'R.ARB',
    unit: '',
    min: 1,
    max: 11,
    step: 1,
    rangeVerified: true,
    carTargets: ['rear-suspension', 'chassis'],
    mechanism: 'Rear roll stiffness; stiffer loads the outside rear faster, taking grip from that axle.',
    higherMeans: 'stiffer',
    lowerMeans: 'softer',
    higher: [0, 2, 1]
  },
  {
    id: 'frontRideHeight',
    category: 'suspension',
    name: 'Front Ride Height',
    shortName: 'F.HEIGHT',
    unit: '',
    min: 1,
    max: 50,
    step: 1,
    rangeVerified: false,
    carTargets: ['chassis', 'floor', 'front-suspension'],
    zone: 'body',
    mechanism: 'Nose height; lower runs the front of the floor closer to the track for more front downforce.',
    higher: [-1, -1, 0],
    straight: { higher: 'noScrape', lower: 'scrapeRisk' }
  },
  {
    id: 'rearRideHeight',
    category: 'suspension',
    name: 'Rear Ride Height',
    shortName: 'R.HEIGHT',
    unit: '',
    min: 1,
    max: 75,
    step: 1,
    rangeVerified: false,
    carTargets: ['chassis', 'floor', 'rear-suspension'],
    zone: 'body',
    mechanism: 'Rear height sets rake; more rake works the diffuser harder for more rear downforce.',
    higherMeans: 'more rake',
    lowerMeans: 'less rake',
    higher: [0, -1, -1],
    straight: { higher: 'topSpeedDown', lower: 'topSpeedUp' }
  },

  // ============ BRAKES ============
  {
    id: 'brakePressure',
    category: 'brakes',
    name: 'Brake Pressure',
    shortName: 'PRESSURE',
    unit: '%',
    min: 50,
    max: 100,
    step: 1,
    rangeVerified: true,
    carTargets: ['front-brakes', 'rear-brakes'],
    mechanism: 'How hard the pads bite for a given pedal input; balance is unchanged, only stopping power.',
    higher: [0, 0, 0],
    straight: { higher: 'shortStop', lower: 'longStop' }
  },
  {
    id: 'brakeBias',
    category: 'brakes',
    name: 'Brake Bias',
    shortName: 'BIAS',
    unit: '% front',
    min: 50,
    max: 70,
    step: 1,
    rangeVerified: true,
    carTargets: ['front-brakes', 'rear-brakes'],
    mechanism: 'Share of braking force on the front axle; the axle doing more work is the one that locks.',
    higherMeans: 'more front',
    lowerMeans: 'more rear',
    higher: [-2, 0, 0],
    straight: { higher: 'frontLock', lower: 'rearLock' }
  },

  // ============ TYRES ============
  {
    id: 'frontLeftPressure',
    category: 'tyres',
    name: 'Front Left Pressure',
    shortName: 'FL PSI',
    unit: 'psi',
    min: 20.0,
    max: 27.0,
    step: 0.1,
    rangeVerified: false,
    carTargets: ['front-left-wheel'],
    mechanism: 'Pressure sets contact patch and temperature; lower is a bigger, hotter patch.',
    higher: [-1, -1, 0],
    straight: { higher: 'runsCool', lower: 'runsHot' }
  },
  {
    id: 'frontRightPressure',
    category: 'tyres',
    name: 'Front Right Pressure',
    shortName: 'FR PSI',
    unit: 'psi',
    min: 20.0,
    max: 27.0,
    step: 0.1,
    rangeVerified: false,
    carTargets: ['front-right-wheel'],
    mechanism: 'Pressure sets contact patch and temperature; lower is a bigger, hotter patch.',
    higher: [-1, -1, 0],
    straight: { higher: 'runsCool', lower: 'runsHot' }
  },
  {
    id: 'rearLeftPressure',
    category: 'tyres',
    name: 'Rear Left Pressure',
    shortName: 'RL PSI',
    unit: 'psi',
    min: 20.0,
    max: 27.0,
    step: 0.1,
    rangeVerified: false,
    carTargets: ['rear-left-wheel'],
    mechanism: 'Pressure sets contact patch and temperature; lower is a bigger, hotter patch.',
    higher: [0, 1, 1],
    straight: { higher: 'runsCool', lower: 'runsHot' }
  },
  {
    id: 'rearRightPressure',
    category: 'tyres',
    name: 'Rear Right Pressure',
    shortName: 'RR PSI',
    unit: 'psi',
    min: 20.0,
    max: 27.0,
    step: 0.1,
    rangeVerified: false,
    carTargets: ['rear-right-wheel'],
    mechanism: 'Pressure sets contact patch and temperature; lower is a bigger, hotter patch.',
    higher: [0, 1, 1],
    straight: { higher: 'runsCool', lower: 'runsHot' }
  }
]

// ============================================================
// Derivations
// ============================================================

/** Balance row for the DOWN direction: explicit override or negated `higher` */
export function getLowerRow(param: SetupParameterDefinition): BalanceRow {
  if (param.lower) return param.lower
  return param.higher.map(b => -b as Balance) as BalanceRow
}

const SHIFT_PHRASE = ['strong understeer', 'understeer', '', 'oversteer', 'strong oversteer'] as const

/**
 * One sentence generated from a matrix row, strongest effect first:
 *   "strong understeer at entry, understeer at apex · higher top speed"
 * Returns the straight cost alone when the row is all zeros, or '' if neither.
 */
export function describeShift(
  param: SetupParameterDefinition,
  direction: 'higher' | 'lower'
): string {
  const row = direction === 'higher' ? param.higher : getLowerRow(param)
  const parts = row
    .map((b, i) => ({ b, phase: CORNER_PHASES[i] }))
    .filter(x => x.b !== 0)
    .sort((a, b) => Math.abs(b.b) - Math.abs(a.b))
    .map(x => `${SHIFT_PHRASE[x.b + 2]} at ${x.phase}`)
  const cost = param.straight?.[direction]
  const straight = cost ? STRAIGHT_LABEL[cost].long : undefined
  if (parts.length === 0) return straight ?? ''
  return straight ? `${parts.join(', ')} · ${straight}` : parts.join(', ')
}

/**
 * Phase where the setting bites hardest: argmax |higher|.
 * Ties resolve to the earliest phase. Null when the setting shifts no balance.
 */
export function getDominantPhase(param: SetupParameterDefinition): CornerPhase | null {
  let best: CornerPhase | null = null
  let bestMag = 0
  param.higher.forEach((b, i) => {
    const mag = Math.abs(b)
    if (mag > bestMag) {
      bestMag = mag
      best = CORNER_PHASES[i]
    }
  })
  return best
}

const FRONT_PARTS: ReadonlySet<CarPartId> = new Set<CarPartId>([
  'front-wing', 'front-left-wheel', 'front-right-wheel', 'front-suspension', 'front-brakes'
])
const REAR_PARTS: ReadonlySet<CarPartId> = new Set<CarPartId>([
  'rear-wing', 'rear-left-wheel', 'rear-right-wheel', 'rear-suspension', 'rear-brakes', 'drivetrain'
])

/** Which axle the knob acts on, from carTargets */
export function getAxleForParameter(param: SetupParameterDefinition): Axle {
  const front = param.carTargets.some(p => FRONT_PARTS.has(p))
  const rear = param.carTargets.some(p => REAR_PARTS.has(p))
  if (front && !rear) return 'front'
  if (rear && !front) return 'rear'
  return 'both'
}

/**
 * Zone for the sidebar. Same rule as axle (front only → front, rear only →
 * rear, else body) unless the parameter sets `zone` explicitly. Ride height
 * overrides to body: it is a floor setting, the axle is just where it's adjusted.
 */
export function getZoneForParameter(param: SetupParameterDefinition): CarZone {
  if (param.zone) return param.zone
  const axle = getAxleForParameter(param)
  return axle === 'both' ? 'body' : axle
}

/** Parameters in a zone, preserving SETUP_PARAMETERS order (grouped by system) */
export function getParametersByZone(zone: CarZone): SetupParameterDefinition[] {
  return SETUP_PARAMETERS.filter(p => getZoneForParameter(p) === zone)
}

export function getParametersByCategory(category: SetupCategory): SetupParameterDefinition[] {
  return SETUP_PARAMETERS.filter(p => p.category === category)
}

export function getParameter(id: keyof F1Setup): SetupParameterDefinition | undefined {
  return SETUP_PARAMETERS.find(p => p.id === id)
}

export function getCarTargets(parameterId: keyof F1Setup): CarPartId[] {
  return getParameter(parameterId)?.carTargets ?? []
}
