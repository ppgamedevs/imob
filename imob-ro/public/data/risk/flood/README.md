Flood risk placeholder dataset.

Expected future formats:
- GeoJSON polygons for flood zones or inundation corridors
- CSV/Parquet points with `lat`, `lng`, `severity`, `updatedAt`
- Vector tiles derived from official hazard maps

Recommended minimum fields:
- `id`
- `level` or `score`
- `sourceName`
- `sourceUrl`
- `updatedAt`

Integration target:
- `src/lib/risk/layers/flood.ts`
