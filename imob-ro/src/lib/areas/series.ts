/**
 * Area Pages v2 - Time Series Utilities
 *
 * Transform database records into time series format for charts.
 */

import type { AreaSeries } from "./dto";

/**
 * Transform AreaDaily records into time series format
 */
export function toSeries(
  daily: Array<{
    date: Date;
    medianEurM2?: number | null;
    supply?: number | null;
    demandScore?: number | null;
    stats?: any;
  }>,
): AreaSeries[] {
  return daily.map((d) => {
    // Extract additional metrics from stats JSON if available
    const stats = (d.stats as any) || {};

    return {
      date: formatDate(d.date),
      eurM2: d.medianEurM2 ?? undefined,
      rentEurM2: stats.rentEurM2 ?? undefined,
      yieldNet: stats.yieldNet ?? undefined,
      ttsDays: stats.ttsDays ?? undefined,
      supply: d.supply ?? undefined,
      demandScore: d.demandScore ?? undefined,
    };
  });
}

/**
 * Format Date to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Filter series by date range
 */
export function filterSeriesByRange(
  series: AreaSeries[],
  range: "3m" | "6m" | "12m",
): AreaSeries[] {
  const now = new Date();
  const months = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const cutoff = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
  const cutoffStr = formatDate(cutoff);

  return series.filter((s) => s.date >= cutoffStr);
}

/**
 * Calculate percentage change between two values
 */
export function calculateChange(current: number, previous: number): number {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get value from N days ago in series
 */
export function getValueNDaysAgo(
  series: AreaSeries[],
  days: number,
  key: keyof AreaSeries,
): number | undefined {
  if (series.length === 0) return undefined;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - days);
  const targetStr = formatDate(targetDate);

  // Find closest date
  let closest = series[0];
  let minDiff = Math.abs(new Date(series[0].date).getTime() - targetDate.getTime());

  for (const point of series) {
    const diff = Math.abs(new Date(point.date).getTime() - targetDate.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest[key] as number | undefined;
}

/**
 * Calculate trend (positive/negative/neutral)
 */
export function calculateTrend(
  series: AreaSeries[],
  key: keyof AreaSeries,
): "up" | "down" | "flat" {
  if (series.length < 2) return "flat";

  const recent = series.slice(-30).filter((s) => s[key] !== undefined);
  if (recent.length < 2) return "flat";

  const first = recent[0][key] as number;
  const last = recent[recent.length - 1][key] as number;

  const change = calculateChange(last, first);

  if (Math.abs(change) < 1) return "flat";
  return change > 0 ? "up" : "down";
}

/**
 * Generate SVG path for sparkline
 */
export function generateSparklinePath(
  series: AreaSeries[],
  key: keyof AreaSeries,
  width: number,
  height: number,
  padding = 4,
): string {
  const data = series.filter((s) => s[key] !== undefined).map((s) => s[key] as number);

  if (data.length === 0) return "";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return `M ${points.join(" L ")}`;
}

/**
 * Format number for display (K for thousands)
 */
export function formatNumber(value: number, decimals = 0): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(decimals)}k`;
  }
  return value.toFixed(decimals);
}

/**
 * Format percentage change with sign
 */
export function formatChange(change: number, decimals = 1): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(decimals)}%`;
}

/**
 * Get latest value from series
 */
export function getLatestValue(series: AreaSeries[], key: keyof AreaSeries): number | undefined {
  for (let i = series.length - 1; i >= 0; i--) {
    const value = series[i][key];
    if (value !== undefined) return value as number;
  }
  return undefined;
}

/**
 * Calculate moving average (smoothing)
 */
export function movingAverage(
  series: AreaSeries[],
  key: keyof AreaSeries,
  window = 7,
): AreaSeries[] {
  const result: AreaSeries[] = [];

  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(series.length, i + Math.ceil(window / 2));
    const slice = series.slice(start, end);

    const values = slice
      .map((s) => s[key] as number | undefined)
      .filter((v): v is number => v !== undefined);

    const avg =
      values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : undefined;

    result.push({
      ...series[i],
      [key]: avg,
    });
  }

  return result;
}
