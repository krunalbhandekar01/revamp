/**
 * Chart colour, by the job the colour does.
 *
 * Series colours are assigned by SLOT, in fixed order, and never cycled: a
 * filter that removes a series must not repaint the survivors. The order below
 * is the validated one — worst adjacent CVD ΔE 9.1 light / 8.4 dark, worst
 * adjacent normal-vision ΔE 22.9 light / 19.8 dark.
 *
 * All values resolve through CSS variables so light/dark swap in one place and
 * dark is a *selected* step, not an inversion.
 */

export const SERIES = [
  'var(--series-1)', // blue
  'var(--series-2)', // orange
  'var(--series-3)', // aqua
  'var(--series-4)', // yellow
  'var(--series-5)', // magenta
  'var(--series-6)', // green
] as const;

/** Sequential — one hue, light → dark. For continuous magnitude only. */
export const SEQUENTIAL = [
  'var(--seq-100)',
  'var(--seq-250)',
  'var(--seq-400)',
  'var(--seq-550)',
  'var(--seq-700)',
] as const;

/**
 * Status is reserved. Never reuse these as "series 4" — they mean a state.
 * Always shipped with a label or icon, never colour alone.
 */
export const STATUS = {
  good: 'var(--good)',
  warning: 'var(--warning)',
  serious: 'var(--serious)',
  critical: 'var(--critical)',
} as const;

export const CHART = {
  grid: 'var(--grid)',
  axis: 'var(--axis)',
  surface: 'var(--surface-2)',
  /** For the "one series is the point, the rest are context" case. */
  deEmphasis: 'var(--de-emphasis)',
  textSecondary: 'var(--text-secondary)',
} as const;

/** Slot lookup. Past the token ceiling, fold the tail into "Other" — never generate a hue. */
export function seriesColor(index: number): string {
  return SERIES[index] ?? CHART.deEmphasis;
}

export const AXIS_PROPS = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;
