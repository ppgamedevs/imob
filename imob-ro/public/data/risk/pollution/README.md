Pollution risk placeholder dataset.

Expected future formats:
- GeoJSON tiles with AQI or PM2.5 / PM10 bands
- CSV/Parquet station feed with `lat`, `lng`, `value`, `unit`, `updatedAt`
- Cached API snapshots transformed into grid cells

Recommended minimum fields:
- `id`
- `score`
- `confidence`
- `sourceName`
- `sourceUrl`
- `updatedAt`

Integration target:
- `src/lib/risk/layers/pollution.ts`
