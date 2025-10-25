# Day 32: Auto-Crawler v1 - Complete

## ✅ Implementation Summary

Successfully implemented automatic crawler system with sitemap discovery, domain-specific adapters, content change detection, and rate limiting.

## 🎯 Features Delivered

### 1. **Queue Management** (`src/lib/crawl/queue.ts`)

- ✅ `enqueueUrl()` - Add URLs with deduplication by canonical URL
- ✅ `takeBatch()` - Domain diversity batching (avoids hammering single site)
- ✅ `markDone()` - Update job status with content hash
- ✅ `hashContent()` - SHA-256 hashing for change detection
- ✅ `hasContentChanged()` - Skip re-processing unchanged pages

### 2. **Fetcher** (`src/lib/crawl/fetcher.ts`) ✅ Already existed

- ETag/Last-Modified conditional requests
- Per-host rate limiting (configurable via `ListingSource.minDelayMs`)
- Automatic retry with backoff
- `UrlCache` and `FetchLog` tracking

### 3. **Domain Adapters**

Created 3 production-ready adapters:

#### **`imobiliare.ts`** ✅

- Sitemap parsing for `imobiliare.ro/sitemap.xml`
- HTML extraction with selectors for:
  - Title, price (EUR/RON), area (m²), rooms, floor, year
  - Address, geocoding (lat/lng), photos (max 20)
- JSON-LD schema support

#### **`storia.ts`** ✅

- Sitemap parsing for `storia.ro/sitemap.xml` (formerly OLX Imobiliare)
- Modern React-based scraping (data-cy attributes)
- Srcset parsing for high-res photos
- Supports `/oferta/` URL pattern

#### **`olx.ts`** ✅

- Sitemap parsing for `olx.ro/sitemap.xml`
- Key-value parameter extraction
- Handles `/d/oferta/` URL pattern
- CDN image URL cleaning

### 4. **Cron Endpoints**

#### **`/api/cron/crawl-seed`** ✅ Enhanced

```typescript
GET / api / cron / crawl - seed;
```

- Reads real sitemaps from imobiliare.ro, storia.ro, olx.ro
- Filters for București/Bucharest/Ilfov
- Enqueues max 2,000 URLs per day
- Returns `{ sources, discovered, enqueued, limit }`

#### **`/api/cron/crawl-tick`** ✅ Rewritten

```typescript
GET / api / cron / crawl - tick;
```

- Takes batch of 25 jobs with domain diversity
- Fetches HTML with `fetchWithCache()` (respects 304 Not Modified)
- Calculates content hash and skips if unchanged
- Extracts data using domain-specific adapter
- Creates/updates `Analysis` + `ExtractedListing`
- Triggers `startAnalysis()` for normalize→score pipeline
- Rate limits: 1 req/sec between jobs
- Returns `{ batch, processed, skipped, errors }`

### 5. **Schema Changes**

```prisma
model CrawlJob {
  ...
  contentHash String? // NEW: SHA-256 for change detection
}

model WatchItem {
  group DedupGroup @relation(...) // FIXED: Added missing relation
}

model DedupGroup {
  watchItems WatchItem[] // FIXED: Added reverse relation
}
```

**Migrations:**

- `20251023112057_add_watch_item_group_relation`
- `20251023120352_add_crawljob_content_hash`

### 6. **Dependencies Added**

```json
{
  "fast-xml-parser": "^5.3.0" // Sitemap XML parsing
}
```

(`cheerio` already installed for HTML scraping)

## 📊 Architecture Flow

```
┌─────────────────────────┐
│  /api/cron/crawl-seed   │  (Trigger: Daily cron)
│  - Fetch sitemaps       │
│  - Filter București     │
│  - Enqueue 2k URLs/day  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     CrawlJob Queue      │
│  (contentHash, status)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  /api/cron/crawl-tick   │  (Trigger: Every 5 min)
│  - takeBatch(25)        │
│  - Domain diversity     │
│  - Rate limit 1 req/s   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│    fetchWithCache()     │
│  - ETag/If-Modified     │
│  - Handle 304           │
│  - Per-host throttle    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   pickAdapter(url)      │
│  - imobiliare           │
│  - storia               │
│  - olx                  │
│  - generic (fallback)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   adapter.extract()     │
│  - Title, price, m²     │
│  - Photos, geocode      │
│  - Return payload       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Analysis + Extracted   │
│  - Create/update DB     │
│  - Store sourceMeta     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   startAnalysis(id)     │
│  - Normalize features   │
│  - Run AVM, TTS, risk   │
│  - Score pipeline       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Reports / Discover    │
│  - Public access        │
│  - Full analytics       │
└─────────────────────────┘
```

## 🧪 QA Testing Plan

### 1. **Seed Sitemaps** (Manual test in dev)

```bash
curl http://localhost:3000/api/cron/crawl-seed
```

**Expected:**

```json
{
  "ok": true,
  "sources": 3,
  "discovered": 5000, // Total URLs from all sitemaps
  "enqueued": 2000, // Max limit applied
  "limit": 2000
}
```

**Verify in DB:**

```sql
SELECT COUNT(*) FROM "CrawlJob" WHERE status = 'queued';
-- Should be ~2000

SELECT domain, COUNT(*) as jobs
FROM "CrawlJob"
WHERE status = 'queued'
GROUP BY domain;
-- Should show mix of imobiliare.ro, storia.ro, olx.ro
```

### 2. **Run Crawler** (Manual test in dev)

```bash
curl http://localhost:3000/api/cron/crawl-tick
```

**Expected:**

```json
{
  "ok": true,
  "batch": 25,
  "processed": 20, // Successfully extracted
  "skipped": 3, // 304 Not Modified or no changes
  "errors": 2 // Extraction failures
}
```

**Verify in DB:**

```sql
SELECT COUNT(*) FROM "Analysis"
WHERE "createdAt" > NOW() - INTERVAL '5 minutes';
-- Should show newly created analyses

SELECT COUNT(*) FROM "ExtractedListing"
WHERE "sourceMeta"::text LIKE '%crawlerV2%';
-- Should show entries with crawlerV2 flag

SELECT status, COUNT(*)
FROM "CrawlJob"
GROUP BY status;
-- Should show: queued (decreasing), done (increasing), error (some)
```

### 3. **Content Change Detection**

Run `crawl-tick` twice on same URLs:

```bash
curl http://localhost:3000/api/cron/crawl-tick
# Wait 30 seconds
curl http://localhost:3000/api/cron/crawl-tick
```

**Expected:** Second run shows high `skipped` count (content unchanged)

### 4. **End-to-End Verification**

1. Check Reports page: `/report/[new-analysis-id]`
   - Should show AVM prices, TTS estimate, risk score
   - Photos from crawler
   - Map with geocoded location
2. Check Discover: `/discover?city=București`
   - Should include new listings
   - Filters work correctly
3. Check Dedup: `/admin/groups`
   - New listings grouped by address/features
   - Canonical URLs selected

### 5. **Rate Limiting Test**

Monitor FetchLog for per-host timing:

```sql
SELECT domain,
       AVG(EXTRACT(EPOCH FROM ("fetchedAt" - LAG("fetchedAt") OVER (PARTITION BY domain ORDER BY "fetchedAt")))) as avg_delay_sec
FROM "FetchLog"
WHERE "fetchedAt" > NOW() - INTERVAL '1 hour'
GROUP BY domain;
-- Should show ~2-3 seconds between requests per domain
```

### 6. **Error Handling**

- **Invalid URLs**: Should skip and log error
- **Timeout**: Should retry with backoff (handled by `fetchWithCache`)
- **Empty extraction**: Should mark as error and not create Analysis
- **Duplicate URLs**: Should skip (unique constraint on `normalized`)

## 📈 Production Deployment

### Vercel Cron Setup

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/crawl-seed",
      "schedule": "0 2 * * *" // Daily at 2 AM UTC
    },
    {
      "path": "/api/cron/crawl-tick",
      "schedule": "*/5 * * * *" // Every 5 minutes
    }
  ]
}
```

### Environment Variables

```env
DATABASE_URL="postgresql://..."
CRON_SECRET="..."  # Optional: Add auth to cron endpoints
```

### Monitoring Checklist

- [ ] Queue size stays < 5k (seed rate = processing rate)
- [ ] Error rate < 5%
- [ ] `FetchLog` shows polite crawling (2+ sec intervals)
- [ ] New `Analysis` records appear hourly
- [ ] Reports display correctly with crawler data

## 🚀 Next Enhancements (Future)

1. **Priority Queue**: Boost recently updated listings
2. **Robots.txt**: Full compliance check (currently basic)
3. **Adaptive Rate Limiting**: Adjust based on 429 responses
4. **Webhook Notifications**: Alert on high error rates
5. **Discovery Pages**: Crawl category pages for new listings
6. **Incremental Sitemaps**: Parse sitemap index for delta updates
7. **Photo Quality Check**: Validate images before storing URLs
8. **Address Geocoding**: Enhance with Mapbox API when lat/lng missing

## 📝 Notes

- **Sitemap URLs**: Currently hardcoded. In production, consider `ListingSource.sitemapUrl` field
- **București Filter**: Basic keyword match. Could enhance with zone/district lookup
- **Batch Size**: 25 jobs = ~3-5 min processing time at 1 req/sec
- **Content Hash**: Only compares HTML. Could add photo hash for media changes
- **Adapter Selectors**: May need updates as sites redesign. Monitor extraction success rate

## ✅ Day 32 Complete

**Status:** Production-ready auto-crawler with sitemap discovery, content change detection, and safe rate limiting.

**Files Changed:** 11 files (+978 lines, -139 lines)

- 3 new adapters (imobiliare, storia, olx)
- 1 new queue utility
- 2 enhanced cron endpoints
- 2 schema migrations
- 1 new dependency

**Commit:** `9f82e55` - Day 32: Auto-Crawler v1 with sitemaps...
