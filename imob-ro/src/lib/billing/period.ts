/**
 * Day 23 - Billing Period Utilities
 * Helpers for calculating billing periods (monthly UTC)
 */

/**
 * Returns the start of the current month in UTC (YYYY-MM-01 00:00:00)
 * Used as periodStart key for UsageCounter
 */
export function monthStartUTC(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
  return x;
}
