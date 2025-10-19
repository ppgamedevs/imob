export type PriceParseResult = { price: number; currency?: string } | null;

export type PriceParser = (html: string, url: string) => PriceParseResult;

// Default generic parser (simple heuristics)
export const defaultParser: PriceParser = (html) => {
  // match € or EUR with thousands separators
  const currencyRegex = /(?:€|EUR|eur)\s?([0-9][0-9 .,_]{2,})/g;
  let match: RegExpExecArray | null;
  while ((match = currencyRegex.exec(html))) {
    const raw = match[1];
    const cleaned = raw.replace(/[ ,_.]/g, "");
    const n = parseInt(cleaned, 10);
    if (!Number.isNaN(n) && n > 100) return { price: n, currency: "EUR" };
  }

  const fallback = html.match(/([0-9]{4,})/);
  if (fallback) return { price: parseInt(fallback[1].replace(/[^0-9]/g, ""), 10), currency: "EUR" };

  return null;
};

// Per-domain parsers map
const parsers: Record<string, PriceParser> = {
  // example.com: customParser,
};

export function getParserForUrl(url: string): PriceParser {
  try {
    const u = new URL(url);
    if (parsers[u.hostname]) return parsers[u.hostname];
  } catch {
    // ignore invalid urls
  }
  return defaultParser;
}
