import { Balance } from '@/data/setupParameters'

/**
 * Shared geometry for every top-down corner drawing: a 90° right-hander,
 * entry straight from the left, arc, exit straight going up.
 * Used by CornerPhaseDiagram (per setting) and BalanceDiagram (the
 * understeer / oversteer page) so the two always look the same.
 */

export const W = 400, H = 250
export const C = { x: 230, y: 140 }      // arc centre
export const R = 70                      // neutral line radius
export const HALF = 26                   // half track width
export const X0 = 30                     // entry start
export const Y1 = 24                     // exit end
export const DEV = 9                     // px of deviation per unit of |balance|

export type Row = [number, number, number]
export interface Pt { x: number; y: number; heading: number }  // heading in degrees, 0 = +x, 90 = +y (down)

/** deviation per phase in px; + = outside (wide), − = inside */
export const deviation = (row: Balance[]): Row => row.map(b => -b * DEV) as Row

/**
 * Sample the line: entry straight, 90° arc with radius blending
 * entry → apex → exit deviation, then the exit straight.
 * Each sample carries the direction of travel.
 */
export function samplePath(row: Balance[]): Pt[] {
  const [dEntry, dApex, dExit] = deviation(row)
  const pts: Pt[] = []
  pts.push({ x: X0, y: C.y + R + dEntry, heading: 0 })
  pts.push({ x: C.x, y: C.y + R + dEntry, heading: 0 })
  const steps = 24
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const deg = 90 - 90 * t
    const d = t < 0.5
      ? dEntry + (dApex - dEntry) * (t / 0.5)
      : dApex + (dExit - dApex) * ((t - 0.5) / 0.5)
    const r = R + d
    const a = (deg * Math.PI) / 180
    // travel direction is tangent to the arc, turning from 0° toward −90° (up)
    pts.push({ x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a), heading: -(90 * t) })
  }
  pts.push({ x: C.x + R + dExit, y: Y1, heading: -90 })
  return pts
}

export function linePath(row: Balance[]) {
  return samplePath(row)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
}

/** Tarmac: outer edge minus inner edge */
export function trackPath() {
  const ro = R + HALF, ri = R - HALF
  return [
    `M${X0} ${C.y + ro}`,
    `L${C.x} ${C.y + ro}`,
    `A${ro} ${ro} 0 0 0 ${C.x + ro} ${C.y}`,
    `L${C.x + ro} ${Y1}`,
    `L${C.x + ri} ${Y1}`,
    `L${C.x + ri} ${C.y}`,
    `A${ri} ${ri} 0 0 1 ${C.x} ${C.y + ri}`,
    `L${X0} ${C.y + ri} Z`
  ].join(' ')
}

/** Shaded band for one phase */
export function bandPath(phase: 'entry' | 'apex' | 'exit') {
  const ro = R + HALF, ri = R - HALF
  if (phase === 'entry') return `M${X0} ${C.y + ro} L${C.x} ${C.y + ro} L${C.x} ${C.y + ri} L${X0} ${C.y + ri} Z`
  if (phase === 'exit') return `M${C.x + ri} ${Y1} L${C.x + ro} ${Y1} L${C.x + ro} ${C.y} L${C.x + ri} ${C.y} Z`
  return `M${C.x} ${C.y + ro} A${ro} ${ro} 0 0 0 ${C.x + ro} ${C.y} L${C.x + ri} ${C.y} A${ri} ${ri} 0 0 1 ${C.x} ${C.y + ri} Z`
}

/** Label slots outside the tarmac */
export const LABELS = {
  entry: { x: (X0 + C.x) / 2, y: C.y + R + HALF + 14 },
  apex: {
    x: C.x + (R + HALF + 16) * Math.cos(Math.PI / 4),
    y: C.y + (R + HALF + 16) * Math.sin(Math.PI / 4) + 4
  },
  exit: { x: C.x + R + HALF + 14, y: (Y1 + C.y) / 2 },
  travel: { x: X0, y: C.y + R - HALF - 8 }
}
