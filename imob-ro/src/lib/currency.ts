export function toEur(amount?: number | null, currency?: string | null, rate?: number) {
  if (amount == null) return undefined;
  const r = rate ?? Number(process.env.EURRON_RATE ?? process.env.EURRON_RATE ?? 4.95);
  if (!currency || String(currency).toUpperCase() === "EUR") return Math.round(amount);
  if (String(currency).toUpperCase() === "RON") return Math.round(amount / (r || 4.95));
  return Math.round(amount);
}
