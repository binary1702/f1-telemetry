/**
 * Guide visual palette. Validated with the dataviz palette checker against the
 * app's dark surface (#111): lightness band, chroma, CVD separation, contrast.
 * Blue is always "lower / understeer / front-limited", orange is always
 * "higher / oversteer / rear-limited", matching the explorer bar.
 */
export const VIZ = {
  lower: '#3b82f6',
  higher: '#ea580c',
  reference: '#6b7280',   // gray-500, the baseline series
  ink: '#e5e7eb',         // gray-200, primary text
  inkMuted: '#9ca3af',    // gray-400
  inkFaint: '#6b7280',    // gray-500
  grid: '#1f2937',        // gray-800
  surface: '#111',
  track: '#374151',       // gray-700, tarmac
  car: '#d1d5db'          // gray-300
} as const
