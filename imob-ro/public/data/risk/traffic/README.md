Traffic risk placeholder dataset.

Expected future formats:
- GeoJSON lines or tiles for arterial road exposure
- CSV point snapshots with congestion or noise proxy values
- Pre-aggregated grid cells keyed by zoom/x/y or by geohash

Recommended minimum fields:
- `id`
- `score`
- `confidence`
- `sourceName`
- `sourceUrl`
- `updatedAt`

Integration target:
- `src/lib/risk/layers/traffic.ts`
