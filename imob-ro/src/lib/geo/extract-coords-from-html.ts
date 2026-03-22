/**
 * Best-effort WGS84 from listing HTML (imobiliare.ro, storia, etc.).
 * Used when server-side adapter runs but also from extractGeneric fallback.
 */
const RO_LAT = { min: 43.5, max: 48.5 } as const;
const RO_LNG = { min: 20.0, max: 30.0 } as const;

function validRo(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat > RO_LAT.min &&
    lat < RO_LAT.max &&
    lng > RO_LNG.min &&
    lng < RO_LNG.max
  );
}

/**
 * Try multiple patterns (JSON config, meta tags, data-*, inline scripts).
 */
export function extractLatLngFromHtml(html: string): { lat: number; lng: number } | null {
  if (!html || html.length < 200) return null;

  const tryPair = (lat: number, lng: number): { lat: number; lng: number } | null =>
    validRo(lat, lng) ? { lat, lng } : null;

  // 1) Common key:value / JSON style (imobiliare historical)
  const latMatch = html.match(/["']?lat(?:itude)?["']?\s*[:=]\s*["']?(-?[\d.]+)/i);
  const lngMatch = html.match(
    /["']?(?:lng|lon|long|longitude)["']?\s*[:=]\s*["']?(-?[\d.]+)/i,
  );
  if (latMatch && lngMatch) {
    const p = tryPair(parseFloat(latMatch[1]), parseFloat(lngMatch[1]));
    if (p) return p;
  }

  // 2) geo.position meta: "44.123;26.456" or "44.123, 26.456"
  const geoPos = html.match(
    /<meta[^>]+name=["']geo\.position["'][^>]+content=["']([^"']+)["']/i,
  );
  if (geoPos) {
    const parts = geoPos[1].split(/[;,]\s*/).map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      const p = tryPair(parts[0], parts[1]);
      if (p) return p;
    }
  }

  // 3) data-lat / data-lng on same snippet (map widgets)
  const dataLat = html.match(/\bdata-lat(?:itude)?=["']([\d.]+)["']/i);
  const dataLng = html.match(/\bdata-(?:lng|lon|longitude)=["']([\d.]+)["']/i);
  if (dataLat && dataLng) {
    const p = tryPair(parseFloat(dataLat[1]), parseFloat(dataLng[1]));
    if (p) return p;
  }

  // 4) GeoCoordinates in ld+json blocks
  const ldBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldBlocks) {
    try {
      const node = JSON.parse(m[1]);
      const arr = Array.isArray(node) ? node : [node];
      for (const item of arr) {
        const geo = item?.geo ?? item?.location ?? item?.geographicCoordinates;
        if (geo && typeof geo === "object") {
          const la = geo.latitude ?? geo.lat;
          const ln = geo.longitude ?? geo.lng ?? geo.lon;
          if (la != null && ln != null) {
            const p = tryPair(Number(la), Number(ln));
            if (p) return p;
          }
        }
      }
    } catch {
      /* continue */
    }
  }

  // 5) "latitude":44.xx "longitude":26.xx (minified JSON in page)
  const jsonLat = html.match(/"latitude"\s*:\s*([\d.]+)/i);
  const jsonLng = html.match(/"longitude"\s*:\s*([\d.]+)/i);
  if (jsonLat && jsonLng) {
    const p = tryPair(parseFloat(jsonLat[1]), parseFloat(jsonLng[1]));
    if (p) return p;
  }

  // 6) center: [lng, lat] or [lat, lng] — Leaflet/Mapbox style (try both orders)
  const bracket = html.match(/\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/);
  if (bracket) {
    const a = parseFloat(bracket[1]);
    const b = parseFloat(bracket[2]);
    const p1 = tryPair(a, b);
    if (p1) return p1;
    const p2 = tryPair(b, a);
    if (p2) return p2;
  }

  return null;
}
