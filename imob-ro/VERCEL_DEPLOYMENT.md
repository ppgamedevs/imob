# Vercel Deployment Guide - Backend Stability Features

## Why You're Not Seeing the Enhancements

The backend stability improvements are **code-level enhancements** that work automatically once deployed. Here's what to check:

## 1. Verify Deployment Status

**Check if latest commit is deployed:**
```bash
# Latest commits pushed:
# 60061e1 - Fix TypeScript compilation errors
# 1f295ff - Backend stability: Idempotency, indices, rate limiting, cron jobs
```

**Go to Vercel Dashboard:**
- Visit: https://vercel.com/[your-team]/[project-name]
- Check "Deployments" tab
- Verify commit `60061e1` or `1f295ff` is deployed
- Status should be "Ready" (not "Building" or "Failed")

## 2. Cron Jobs Configuration

**Fixed vercel.json paths** to match actual API routes:
```json
{
  "crons": [
    { "path": "/api/cron/crawl-seed", "schedule": "0 * * * *" },
    { "path": "/api/cron/crawl-tick", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/dedup-tick", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/provenance-tick", "schedule": "0 * * * *" },
    { "path": "/api/cron/avm-train", "schedule": "0 2 * * *" },
    { "path": "/api/cron/tiles/rebuild", "schedule": "0 3 * * 0" },
    { "path": "/api/cron/revalidate-zones", "schedule": "0 0 * * *" },
    { "path": "/api/cron/taste/decay", "schedule": "0 4 * * *" },
    { "path": "/api/cron/saved-search", "schedule": "0 6 * * *" }
  ]
}
```

**To verify cron jobs on Vercel:**
1. Go to Vercel Dashboard → Your Project
2. Click "Settings" → "Cron Jobs"
3. You should see 9 cron jobs listed
4. **Note**: Cron jobs require **Pro tier** or higher on Vercel

**If on Hobby tier:**
- Cron jobs won't appear/work
- Consider upgrading or use external cron service (GitHub Actions, etc.)

## 3. Database Migrations

**Verify migration is applied:**
```bash
# Check Neon.tech dashboard
# Migration: 20251023175518_add_content_hash_and_indices
# Should show in migration history
```

**Applied changes:**
- `contentHash` field on Analysis table
- 3 new indices: `Analysis.createdAt`, `Analysis.contentHash`, `ExtractedListing.analysisId`

**Test in production:**
```sql
-- Connect to Neon.tech console
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Analysis' AND column_name = 'contentHash';
-- Should return: contentHash
```

## 4. Test Backend Stability Features

### **A. Test Idempotency (Content Deduplication)**

**Using browser extension:**
```javascript
// Submit same listing twice to /api/analyze/client-push
// First request: { analysisId: "cm...", cached: false }
// Second request: { analysisId: "cm...", cached: true, reason: "duplicate_content" }
```

**Expected behavior:**
- First submission creates new analysis
- Second submission returns cached analysis ID (no reprocessing)

### **B. Test Rate Limiting**

**Using curl/Postman:**
```bash
# Send 31 requests in 1 minute to /api/analyze/client-push
for i in {1..31}; do
  curl -X POST https://your-domain.vercel.app/api/analyze/client-push \
    -H "Content-Type: application/json" \
    -d '{"originUrl":"https://example.com","extracted":{}}' &
done
wait

# Request #31 should return:
# Status: 429
# Headers:
#   Retry-After: 30
#   X-RateLimit-Limit: 30
#   X-RateLimit-Remaining: 0
# Body:
#   { "error": "rate_limit_exceeded", "retryAfter": 30 }
```

### **C. Test Public API Endpoints**

**Test area KPIs:**
```bash
curl -X GET "https://your-domain.vercel.app/api/public/area/bucuresti-sector-1/kpis" \
  -H "x-api-key: YOUR_API_KEY"

# Expected response:
{
  "slug": "bucuresti-sector-1",
  "name": "Sector 1",
  "medianEurM2": 2100,
  "change30d": 0.03,
  "rentEurM2": 12.5,
  "yieldNet": 0.058,
  "ttsMedianDays": 45,
  "demandScore": 0.75,
  "supply": 234
}
```

**Test price estimation:**
```bash
curl -X GET "https://your-domain.vercel.app/api/public/estimate?areaSlug=bucuresti-sector-1&areaM2=65&rooms=2" \
  -H "x-api-key: YOUR_API_KEY"

# Expected response:
{
  "low": 95000,
  "mid": 110000,
  "high": 125000,
  "conf": 0.85,
  "eurM2": 1692
}
```

## 5. Widget Testing

**Test AVM widget:**
```html
<!-- Create test.html -->
<!DOCTYPE html>
<html>
<body>
  <iframe 
    src="https://your-domain.vercel.app/widgets/avm.html" 
    width="400" 
    height="600"
  ></iframe>
</body>
</html>
```

**Open in browser and verify:**
- Widget loads
- Form is functional
- Price estimation works
- Widget tracks load (check EmbedUsage table)

## 6. Monitoring & Verification

### **Database Checks**

**Verify indices are active:**
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Analysis';
-- Should show: Analysis_createdAt_idx, Analysis_contentHash_idx
```

**Check content hash generation:**
```sql
SELECT id, sourceUrl, contentHash, status 
FROM "Analysis" 
ORDER BY "createdAt" DESC 
LIMIT 10;
-- contentHash should be populated (64-char hex string)
```

**Check dedup effectiveness:**
```sql
SELECT contentHash, COUNT(*) as duplicates
FROM "Analysis"
WHERE contentHash IS NOT NULL
GROUP BY contentHash
HAVING COUNT(*) > 1;
-- Shows how many duplicates were caught
```

### **API Usage Tracking**

**Check API key usage:**
```sql
SELECT ak.name, COUNT(au.id) as requests, MAX(au."createdAt") as last_used
FROM "ApiKey" ak
LEFT JOIN "ApiUsage" au ON au."apiKeyId" = ak.id
GROUP BY ak.id, ak.name;
```

**Check widget embeds:**
```sql
SELECT widgetType, domain, COUNT(*) as loads
FROM "EmbedUsage"
GROUP BY widgetType, domain
ORDER BY loads DESC
LIMIT 20;
-- Shows top domains using your widgets
```

## 7. Common Issues & Solutions

### **Issue: Cron jobs not appearing in Vercel**
**Solution:** 
- Verify you're on Pro tier or higher
- Check vercel.json is in project root
- Redeploy project after adding vercel.json
- Visit Settings → Cron Jobs to enable

### **Issue: Rate limiting not working**
**Solution:**
- Check deployment includes new files
- Verify `src/lib/rate-limiter-enhanced.ts` is deployed
- Test with unique IP (Vercel may cache)

### **Issue: contentHash is null**
**Solution:**
- Run migration manually: `npx prisma migrate deploy`
- Check Neon.tech for migration status
- Verify Prisma Client is regenerated

### **Issue: Public API returns 401**
**Solution:**
- Generate API key in `/admin/api-keys`
- Add to widget HTML or request headers
- Check key is active and not expired

## 8. Performance Metrics to Track

**In Vercel Analytics:**
- API response times (should improve with indices)
- 429 rate limit responses
- Error rates

**In Database:**
- Query performance (EXPLAIN ANALYZE on common queries)
- Dedup hit rate (cached vs new analyses)
- Index usage statistics

## 9. Next Deployment Steps

```bash
# 1. Commit vercel.json fix
git add vercel.json
git commit -m "Fix vercel.json cron paths to match actual API routes"
git push origin main

# 2. Wait for Vercel deployment
# Check: https://vercel.com/[team]/[project]/deployments

# 3. Enable cron jobs in Vercel dashboard
# Settings → Cron Jobs → Enable all

# 4. Test endpoints
# Use curl/Postman to verify rate limiting and public API

# 5. Monitor logs
# Vercel Dashboard → Logs → Real-time
```

## 10. Checklist

- [ ] Latest commits deployed on Vercel (60061e1)
- [ ] Database migration applied (check Neon.tech)
- [ ] vercel.json has correct cron paths
- [ ] Cron jobs visible in Vercel dashboard (Pro tier only)
- [ ] Rate limiting returns 429 after 30 requests/min
- [ ] Public API endpoints return data with x-api-key
- [ ] Widgets load and track referrer
- [ ] contentHash populated in Analysis table
- [ ] Indices created (check pg_indexes)

---

**The stability features are working if:**
1. ✅ Build succeeds without errors
2. ✅ Database has contentHash field and indices
3. ✅ Rate limiting returns 429 with proper headers
4. ✅ Duplicate content returns cached response
5. ✅ Public API responds to authenticated requests
6. ✅ Cron jobs appear in Vercel dashboard (if Pro tier)

**Most features work invisibly** - they improve performance, prevent abuse, and enable deduplication without visible UI changes.
