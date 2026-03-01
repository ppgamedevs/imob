/** Shared math utilities - single source of truth. */

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** IQR-based outlier filtering. Returns values within [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. */
export function filterOutliersIQR(values: number[]): { filtered: number[]; excluded: number[] } {
  if (values.length < 4) return { filtered: values, excluded: [] };
  const q1 = percentile(values, 25)!;
  const q3 = percentile(values, 75)!;
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const filtered: number[] = [];
  const excluded: number[] = [];
  for (const v of values) {
    if (v >= lo && v <= hi) filtered.push(v);
    else excluded.push(v);
  }
  return { filtered, excluded };
}
