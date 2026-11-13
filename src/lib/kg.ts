/**
 * Kilo arithmetic without floating-point drift: values are summed as integer tenths.
 */

/** Round to one decimal. */
export function roundKg(kg: number): number {
  return Math.round(kg * 10) / 10;
}

/** Sum kilos exactly to one decimal. */
export function sumKg(values: Iterable<number>): number {
  let tenths = 0;
  for (const v of values) tenths += Math.round(v * 10);
  return tenths / 10;
}

/** kg-weighted average of a percentage; null when there is no weight. */
export function weightedPct(items: Iterable<{ kg: number; pct: number }>): number | null {
  let w = 0;
  let s = 0;
  for (const it of items) {
    if (it.kg <= 0) continue;
    w += it.kg;
    s += it.kg * it.pct;
  }
  return w > 0 ? Math.round((s / w) * 10) / 10 : null;
}
