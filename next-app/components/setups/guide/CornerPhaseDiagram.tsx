import { SetupParameterDefinition, CORNER_PHASES, getLowerRow } from '@/data/setupParameters'
import { VIZ } from './palette'
import { W, H, C, R, X0, HALF, linePath, trackPath, bandPath, LABELS } from './cornerGeometry'

/**
 * Generic, driven by the parameter's matrix. Grey dashed neutral line,
 * orange ↑ line and blue ↓ line deviating where the row is non-zero.
 * Understeer (−) runs wide, oversteer (+) tucks inside.
 */

const BAND_OPACITY = [0.03, 0.10, 0.20]  // by |balance|

export default function CornerPhaseDiagram({ param }: { param: SetupParameterDefinition }) {
  const lower = getLowerRow(param)
  const higherAny = param.higher.some(b => b !== 0)
  const lowerAny = lower.some(b => b !== 0)

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-64 mx-auto" role="img" aria-label="Top-down corner showing where this setting changes the car's line">
        <path d={trackPath()} fill={VIZ.track} opacity="0.35" />
        {CORNER_PHASES.map((p, i) => (
          <path key={p} d={bandPath(p)} fill={VIZ.ink} opacity={BAND_OPACITY[Math.abs(param.higher[i])]} />
        ))}

        <text x={LABELS.entry.x} y={LABELS.entry.y} fill={VIZ.inkFaint} fontSize="10" textAnchor="middle" letterSpacing="1.5">ENTRY</text>
        <text x={LABELS.apex.x} y={LABELS.apex.y} fill={VIZ.inkFaint} fontSize="10" textAnchor="middle" letterSpacing="1.5">APEX</text>
        <text x={LABELS.exit.x} y={LABELS.exit.y} fill={VIZ.inkFaint} fontSize="10" textAnchor="middle" letterSpacing="1.5"
          transform={`rotate(90 ${LABELS.exit.x} ${LABELS.exit.y})`}>EXIT</text>
        <text x={LABELS.travel.x} y={LABELS.travel.y} fill={VIZ.inkFaint} fontSize="9">travel →</text>

        <path d={linePath([0, 0, 0])} fill="none" stroke={VIZ.reference} strokeWidth="2" strokeDasharray="5 4" />
        {lowerAny && <path d={linePath(lower)} fill="none" stroke={VIZ.lower} strokeWidth="2.5" />}
        {higherAny && <path d={linePath(param.higher)} fill="none" stroke={VIZ.higher} strokeWidth="2.5" />}

        <rect x={X0 + 6} y={C.y + R - 5} width="18" height="10" rx="2" fill={VIZ.car} />
      </svg>

      <div className="flex flex-wrap gap-4 px-1 text-[9px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: VIZ.reference }} />neutral</span>
        {higherAny && <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: VIZ.higher }} />↑ {param.higherMeans ?? 'higher'}</span>}
        {lowerAny && <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2" style={{ borderColor: VIZ.lower }} />↓ {param.lowerMeans ?? 'lower'}</span>}
        <span className="text-gray-600">outside the dashes = understeer · inside = oversteer · bright band = where it bites</span>
      </div>
    </div>
  )
}
