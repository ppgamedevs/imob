# POI pipeline audit (internal)

## Historical false-zero causes

1. **Uniform `filterByRadius(userRadius)`** on all intel buckets after fetch. Example: UI 500 m removed schools valid at 800–1200 m even though Overpass returned them.
2. **Single fetch radius** for every category instead of semantic radii (schools/hospitals need larger rings than parking).
3. **Tag starvation**: only `shop=supermarket` etc. misses dense `shop=*` mapping in Bucharest.
4. **Node-only queries** for some amenities mapped primarily as ways/relations.
5. **Dedup gaps**: node + way duplicates could inflate counts; without dedupe, variety metrics were noisy.

## Current mitigations

- Per-tag **semantic `around:`** radii in `overpass-lines.ts` + **floor** = user radius.
- **node + way + relation** expansion for catalog fragments (except explicit `way[` parking lines).
- **Normalization** by tag priority in `normalize-osm-poi.ts`, then **dedupe** in `deduplicate-pois.ts`.
- **Display cap** per intel category: `max(userRadius, INTEL_CATEGORY_MIN_RADIUS_M[key])` so short UI radii do not erase real nearby amenities.
- **Low-data mode** from `evaluate-poi-quality.ts` (stricter in Bucharest bbox) drives uncertain scores + UI copy, not “lipsuri”.

## Debug

Set `POI_PIPELINE_DEBUG=1` on the server to log counts per request.
