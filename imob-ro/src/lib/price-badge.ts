/* eslint-disable prettier/prettier */

export function computePriceBadge(
  asking?: number | null,
  low?: number | null,
  mid?: number | null,
  high?: number | null,
): "Underpriced" | "Fair" | "Overpriced" | undefined {
  if (asking == null || low == null || mid == null || high == null) return undefined;
  if (asking < low) return "Underpriced";
  if (asking > high) return "Overpriced";
  return "Fair";
}
