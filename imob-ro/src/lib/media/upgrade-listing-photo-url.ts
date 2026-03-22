/**
 * Upgrade listing image URLs to larger CDN variants where we know the pattern.
 * Thumbnails in HTML/JSON are often small; og:image and first gallery hits may already be large.
 */

/** Prefer the widest candidate from an HTML srcset string. */
export function pickLargestSrcsetUrl(srcset: string | undefined): string | null {
  if (!srcset) return null;
  let best: { url: string; w: number } | null = null;
  for (const part of srcset.split(",")) {
    const m = part.trim().match(/^(\S+)\s+(\d+)w$/);
    if (m) {
      const w = parseInt(m[2], 10);
      if (!best || w > best.w) best = { url: m[1], w };
    }
  }
  if (best) return best.url;
  const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
  return first?.startsWith("http") ? first : null;
}

const PATH_SIZE_RE = /\/(\d{2,4})x(\d{2,4})\//g;

/** Minimum dimension to treat as already high-res (avoid pointless CDN churn). */
const MIN_W = 1000;
const MIN_H = 700;

const IMOBILIARE_LARGE = "/1220x924/";

function replacePathDimensions(pathname: string, targetSegment: string): string {
  return pathname.replace(PATH_SIZE_RE, (full, w: string, h: string) => {
    const nw = parseInt(w, 10);
    const nh = parseInt(h, 10);
    if (nw >= MIN_W && nh >= MIN_H) return full;
    return targetSegment;
  });
}

/** `photo-320x240.jpg` style (common on some CDNs) */
const FILENAME_SIZE_RE = /(\/|^)(\d{2,4})x(\d{2,4})\.(jpe?g|webp|png)(\?|$)/i;

function replaceFilenameDimensions(pathname: string): string {
  return pathname.replace(
    FILENAME_SIZE_RE,
    (match, lead, w: string, h: string, ext: string, tail: string) => {
      const nw = parseInt(w, 10);
      const nh = parseInt(h, 10);
      if (nw >= MIN_W && nh >= MIN_H) return match;
      // avoid false positives like rare "12x14" tokens in filenames
      if (nw < 64 && nh < 64) return match;
      return `${lead}1220x924.${ext}${tail === "?" ? "?" : tail}`;
    },
  );
}

function stripDownsizingSearchParams(u: URL): void {
  const keys = ["w", "width", "imwidth", "imWidth", "resizeWidth", "tw", "th", "q", "quality"];
  for (const k of keys) u.searchParams.delete(k);
}

/**
 * Best-effort larger image URL for report UI (and re-analysis inputs).
 * Safe to call on any string; returns original on failure.
 */
export function upgradeListingPhotoUrl(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;
  if (raw.startsWith("//")) raw = `https:${raw}`;
  if (!raw.startsWith("http")) return raw;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const fullHost = host.replace(/^www\./, "");

    const isImobiliare =
      fullHost.includes("imobiliare.ro") ||
      fullHost.includes("imobiliare") ||
      fullHost.includes("staticserv.imobiliare") ||
      fullHost.includes("statics.imobiliare");

    if (isImobiliare) {
      let path = u.pathname;
      path = path
        .replace(/_thumb\b/gi, "")
        .replace(/-thumb\b/gi, "")
        .replace(/_small\b/gi, "");
      path = replacePathDimensions(path, IMOBILIARE_LARGE);
      path = replaceFilenameDimensions(path);
      u.pathname = path;
      stripDownsizingSearchParams(u);
      return u.toString();
    }

    // Roam CDN (i.roamcdn.net): do NOT rewrite gallery-thumb-* / listing-thumb-* to /WxH/ —
    // the resize backend returns 5xx for guessed segments; larger variants must come from HTML/JSON.
    if (fullHost.includes("roamcdn.net")) {
      stripDownsizingSearchParams(u);
      return u.toString();
    }

    // Storia / Otodom-style img.* paths often embed /WxH/
    if (
      fullHost.includes("storia.ro") ||
      fullHost.includes("img.storia") ||
      fullHost.includes("statics.storia") ||
      fullHost.includes("otodom") ||
      fullHost.includes("olx.ro") ||
      fullHost.includes("olxst.com")
    ) {
      let path = u.pathname;
      path = replacePathDimensions(path, "/1920x1440/");
      path = replaceFilenameDimensions(path);
      u.pathname = path;
      stripDownsizingSearchParams(u);
      return u.toString();
    }

    if (
      fullHost.includes("publi24") ||
      fullHost.includes("lajumate") ||
      fullHost.includes("homezz")
    ) {
      let path = u.pathname;
      path = replacePathDimensions(path, "/1200x900/");
      u.pathname = path;
      stripDownsizingSearchParams(u);
      return u.toString();
    }

    // Generic listing CDNs: bump /WxH/ path segments and filename sizes on obvious image URLs
    if (/\.(jpe?g|webp|png|gif)(\?|$)/i.test(u.pathname)) {
      let path = u.pathname;
      const before = path;
      path = replacePathDimensions(path, "/1600x1200/");
      path = replaceFilenameDimensions(path);
      if (path !== before) {
        u.pathname = path;
        stripDownsizingSearchParams(u);
        return u.toString();
      }
    }

    return raw;
  } catch {
    return raw;
  }
}
