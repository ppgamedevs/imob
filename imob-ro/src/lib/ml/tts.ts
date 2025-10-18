/**
 * Time-to-Sell estimator (v1)
 * estimateTTS({ priceDelta, demandScore, season }) -> bucket string
 * - priceDelta: actualPrice / avmMid - 1 (positive -> over-priced, negative -> under-priced)
 * - demandScore: 0..1 (higher -> more demand)
 * - season: 'high'|'low'|'neutral' (affects speed)
 *
 * Returns one of: '<30', '30-60', '60-90', '90+'
 */

export type TtsInput = {
  priceDelta: number; // e.g. 0.1 for +10%
  demandScore: number; // 0..1
  season?: "high" | "low" | "neutral";
};

export function estimateTTS({ priceDelta, demandScore, season = "neutral" }: TtsInput) {
  // baseline expected days (in months * 30)
  // Start with a base of 60 days
  let days = 60;

  // Price delta effect: overpriced increases days, underpriced decreases
  // Use a smooth logistic-ish transform
  days *= 1 + Math.tanh(priceDelta * 3) * 0.6; // capped multiplier roughly in (0.4..1.6)

  // Demand effect: higher demand reduces days (log scale)
  const demandFactor = 1 - Math.min(0.9, Math.log10(1 + demandScore * 9) * 0.2);
  days *= demandFactor;

  // Season adjustment
  if (season === "high") days *= 0.9;
  if (season === "low") days *= 1.15;

  // Clamp to reasonable range
  days = Math.max(7, Math.min(365, days));

  // Bucketize
  if (days < 30) return { days: Math.round(days), bucket: "<30" };
  if (days < 60) return { days: Math.round(days), bucket: "30-60" };
  if (days < 90) return { days: Math.round(days), bucket: "60-90" };
  return { days: Math.round(days), bucket: "90+" };
}

export function humanizeBucket(bucket: string) {
  switch (bucket) {
    case "<30":
      return "Sub 30 zile";
    case "30-60":
      return "30–60 zile";
    case "60-90":
      return "60–90 zile";
    case "90+":
      return "Peste 90 zile";
    default:
      return String(bucket);
  }
}

export default estimateTTS;
