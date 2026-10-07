'use client'

import {
  SetupParameterDefinition,
  Balance,
  StraightCost,
  CORNER_PHASES,
  STRAIGHT_LABEL,
  getLowerRow
} from '@/data/setupParameters'

/**
 * The one table every setting is described by:
 *
 *                ENTRY  APEX  EXIT   STRAIGHT
 *   ↑ higher      [b]    [b]   [b]    cost
 *   ↓ lower       [b]    [b]   [b]    cost
 *
 * Layout invariants, so content can never break it:
 *   1. Fixed geometry. Explicit grid columns and one fixed row height.
 *      Nothing is sized by its text.
 *   2. Bounded vocabulary. Balance cells show one of five single words.
 *      Straight cells show STRAIGHT_LABEL.short, capped at 11 characters
 *      by the type system.
 * Blue = understeer (pushes wide), orange = oversteer (rotates). Intensity
 * is magnitude. Used by the explorer bar and the guide page alike.
 */

export type Direction = 'higher' | 'lower'

// Column widths in rem. Phase cells fit 'understeer' at 10px with room; straight fits 11 chars.
const COLS = 'minmax(5rem, 6rem) repeat(3, 4.5rem) 6.5rem'
const ROW_H = 'h-6'

// Indexed by balance + 2, i.e. [-2, -1, 0, 1, 2]. Two words only; magnitude is the fill.
const BALANCE_LABEL = ['understeer', 'understeer', '·', 'oversteer', 'oversteer'] as const
const BALANCE_CLASS = [
  'bg-blue-500/35 text-blue-100 font-semibold',
  'bg-blue-500/15 text-blue-300',
  'text-gray-700',
  'bg-orange-500/15 text-orange-300',
  'bg-orange-500/35 text-orange-100 font-semibold'
] as const

const cellBase = `${ROW_H} rounded flex items-center justify-center text-[10px] leading-none whitespace-nowrap overflow-hidden`

function Cell({ balance }: { balance: Balance }) {
  const i = balance + 2
  return <div className={`${cellBase} ${BALANCE_CLASS[i]}`}>{BALANCE_LABEL[i]}</div>
}

function StraightCell({ cost }: { cost?: StraightCost }) {
  return (
    <div
      className={`${cellBase} px-1.5 text-gray-400 bg-gray-800/60`}
      title={cost ? STRAIGHT_LABEL[cost].long : undefined}
    >
      {cost ? STRAIGHT_LABEL[cost].short : '·'}
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-3 flex items-end justify-center text-[8px] text-gray-500 uppercase tracking-wider leading-none">
      {children}
    </div>
  )
}

function RowLabel({ glyph, means }: { glyph: string; means?: string }) {
  return (
    <div className={`${ROW_H} flex items-center gap-1 pr-1 whitespace-nowrap overflow-hidden`}>
      <span className="text-xs font-bold text-gray-300">{glyph}</span>
      {means && <span className="text-[9px] text-gray-500 truncate">{means}</span>}
    </div>
  )
}

interface BalanceMatrixProps {
  param: SetupParameterDefinition
  /** Which direction the slider has moved from baseline; undefined = at baseline */
  direction?: Direction
}

export default function BalanceMatrix({ param, direction }: BalanceMatrixProps) {
  const rows: Array<{ dir: Direction; glyph: string; means?: string; row: Balance[]; cost?: StraightCost }> = [
    { dir: 'higher', glyph: '↑', means: param.higherMeans, row: param.higher, cost: param.straight?.higher },
    { dir: 'lower', glyph: '↓', means: param.lowerMeans, row: getLowerRow(param), cost: param.straight?.lower }
  ]

  return (
    <div
      className="grid gap-x-1 gap-y-1 w-max max-w-full"
      style={{ gridTemplateColumns: COLS }}
    >
      {/* header row */}
      <div />
      {CORNER_PHASES.map(p => <Head key={p}>{p}</Head>)}
      <Head>straight</Head>

      {/* one grid row per direction; dim the row that is not the slider's direction */}
      {rows.map(r => {
        const dim = direction !== undefined && direction !== r.dir ? 'opacity-25' : ''
        return (
          <div key={r.dir} className="contents">
            <div className={`transition-opacity duration-150 ${dim}`}><RowLabel glyph={r.glyph} means={r.means} /></div>
            {r.row.map((b, i) => (
              <div key={CORNER_PHASES[i]} className={`transition-opacity duration-150 ${dim}`}><Cell balance={b} /></div>
            ))}
            <div className={`transition-opacity duration-150 ${dim}`}><StraightCell cost={r.cost} /></div>
          </div>
        )
      })}
    </div>
  )
}
