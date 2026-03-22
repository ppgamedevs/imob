# Geo POI sources (zone intel)

Neighborhood intel loads points of interest with:

1. **OpenStreetMap** via Overpass (always).
2. **Google Places Nearby Search (legacy)** when OSM returns fewer than ~18 merged POIs before Google (optional).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_PLACES_API_KEY` | No | Server-side Places API key (Places API enabled). |
| `GOOGLE_MAPS_API_KEY` | No | Fallback if `GOOGLE_PLACES_API_KEY` is unset. |
| `OVERPASS_ENDPOINT` | No | Override Overpass URL (default: `https://overpass-api.de/api/interpreter`). |

## Pipeline behavior

- Overpass queries are **batched** with **per-theme `around:` radii** (shops ~1 km, healthcare ~2 km, etc.) and a **floor** of the user-selected radius.
- After normalization, each intel category keeps POIs up to  
  `min(5000 m, max(userRadius, INTEL_CATEGORY_MIN_RADIUS_M[category]))`  
  so a 500 m UI ring does not wipe schools / hospitals that are slightly farther but still relevant.
- Set **`POI_PIPELINE_DEBUG=1`** on the server to log raw element counts, deduped totals, and quality reasons per request.

## Fallback providers

- **`PoiProvider`** interface: `src/lib/geo/poi/providers/types.ts`
- **OSM**: `src/lib/geo/poi/providers/osm-poi-provider.ts`
- **Foursquare stub** (no API yet): `src/lib/geo/poi/providers/foursquare-poi-provider.stub.ts`

## Manual Bucharest check

```bash
POI_PIPELINE_DEBUG=1 npx tsx scripts/debug-poi-pipeline.ts
```
