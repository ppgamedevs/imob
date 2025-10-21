import { normalizeUrl } from "@/lib/url";

export function domainFrom(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function signature(input: {
  url: string;
  title?: string | null;
  price?: number | null;
  area?: number | null;
}) {
  // simplu: normalize(url) + price + area
  const u = normalizeUrl(input.url) ?? input.url.trim();
  const p = input.price ?? 0;
  const a = input.area ?? 0;
  return `${u}#${p}#${a}`.toLowerCase();
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
