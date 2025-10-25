const TOKEN = process.env.MAPBOX_TOKEN || process.env.MAPBOX_API_TOKEN || "";
const base = "https://api.mapbox.com/geocoding/v5/mapbox.places";

type GeoResp = { features?: { center?: [number, number]; place_name?: string; context?: any[] }[] };

function pickCityNeighborhood(ctx: any[] = []) {
  let city: string | undefined, neighborhood: string | undefined;
  for (const c of ctx) {
    if (typeof c?.id === "string" && c.text) {
      if (c.id.startsWith("place")) city = city || c.text;
      if (c.id.startsWith("neighborhood")) neighborhood = neighborhood || c.text;
      if (c.id.startsWith("locality")) city = city || c.text;
    }
  }
  return { city, neighborhood };
}

export async function geocodeAddress(address: string) {
  try {
    if (!TOKEN || !address) return null;
    const url = `${base}/${encodeURIComponent(address)}.json?access_token=${TOKEN}&language=ro&limit=1&types=address,place,locality,neighborhood,poi`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j: GeoResp = await r.json();
    const f = j.features?.[0];
    if (!f?.center) return null;
    const [lng, lat] = f.center;
    const { city, neighborhood } = pickCityNeighborhood((f as any).context);
    return { lat, lng, city, neighborhood };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number) {
  try {
    if (!TOKEN || lat == null || lng == null) return null;
    const url = `${base}/${lng},${lat}.json?access_token=${TOKEN}&language=ro&limit=1&types=address,place,locality,neighborhood`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j: GeoResp = await r.json();
    const f = j.features?.[0];
    if (!f?.center) return null;
    const { city, neighborhood } = pickCityNeighborhood((f as any).context);
    return { city, neighborhood, address: f.place_name };
  } catch {
    return null;
  }
}
