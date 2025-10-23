# Cron Job Strategy for Vercel Hobby Tier

## Problem
Vercel Hobby tier limits you to **2 cron jobs** maximum. We need 9 background jobs.

## Solution: Prioritized Cron Jobs

### ✅ Enabled (2 most critical)

**1. `/api/cron/crawl-tick`** - Every 5 minutes
- **Why**: Core feature - keeps listings fresh
- **Impact**: Without this, no new listings get processed
- **Priority**: CRITICAL

**2. `/api/cron/dedup-tick`** - Every 15 minutes
- **Why**: Backend stability - prevents duplicate listings
- **Impact**: Without this, database gets cluttered with dupes
- **Priority**: HIGH

### ⏸️ Disabled (can trigger manually or upgrade)

**3. `crawl-seed`** - Hourly
- **Alternative**: Manually call `/api/cron/crawl-seed` when needed
- **Impact**: Less automatic discovery of new sources
- **Trigger manually**: `curl -X POST https://your-domain.vercel.app/api/cron/crawl-seed`

**4. `provenance-tick`** - Hourly
- **Alternative**: Manually call `/api/cron/provenance-tick`
- **Impact**: Group assignments happen less frequently
- **Trigger manually**: `curl -X POST https://your-domain.vercel.app/api/cron/provenance-tick`

**5. `avm-train`** - Daily at 2 AM
- **Alternative**: Manually call `/api/cron/avm-train` weekly
- **Impact**: AVM model gets stale over time
- **Trigger manually**: `curl -X POST https://your-domain.vercel.app/api/cron/avm-train`

**6. `tiles/rebuild`** - Weekly on Sunday at 3 AM
- **Alternative**: Manually call `/api/cron/tiles/rebuild` monthly
- **Impact**: Area tiles don't update as frequently
- **Trigger manually**: `curl -X POST https://your-domain.vercel.app/api/cron/tiles/rebuild`

**7. `revalidate-zones`** - Daily at midnight
- **Alternative**: Manually call `/api/cron/revalidate-zones`
- **Impact**: Zone pages might show stale data
- **Trigger manually**: `curl -X POST https://your-domain.vercel.app/api/cron/revalidate-zones`

**8. `taste/decay`** - Daily at 4 AM
- **Alternative**: Manually call `/api/cron/taste/decay` weekly
- **Impact**: User taste profiles decay slower
- **Trigger manually**: `curl -X POST https://your-domain.vercel.app/api/cron/taste/decay`

**9. `saved-search`** - Daily at 6 AM
- **Alternative**: Manually call `/api/cron/saved-search`
- **Impact**: Users don't get automatic saved search alerts
- **Trigger manually**: `curl -X POST https://your-domain.vercel.app/api/cron/saved-search`

## Manual Trigger Script

Create a local script to trigger all disabled cron jobs:

```bash
#!/bin/bash
# trigger-crons.sh

DOMAIN="https://your-domain.vercel.app"

echo "Triggering crawl-seed..."
curl -X POST "$DOMAIN/api/cron/crawl-seed"

echo "Triggering provenance-tick..."
curl -X POST "$DOMAIN/api/cron/provenance-tick"

echo "Triggering avm-train..."
curl -X POST "$DOMAIN/api/cron/avm-train"

echo "Triggering tiles/rebuild..."
curl -X POST "$DOMAIN/api/cron/tiles/rebuild"

echo "Triggering revalidate-zones..."
curl -X POST "$DOMAIN/api/cron/revalidate-zones"

echo "Triggering taste/decay..."
curl -X POST "$DOMAIN/api/cron/taste/decay"

echo "Triggering saved-search..."
curl -X POST "$DOMAIN/api/cron/saved-search"

echo "✅ All cron jobs triggered"
```

### Usage
```powershell
# PowerShell version
$domain = "https://your-domain.vercel.app"
@("crawl-seed", "provenance-tick", "avm-train", "tiles/rebuild", "revalidate-zones", "taste/decay", "saved-search") | ForEach-Object {
    Write-Host "Triggering $_..."
    Invoke-WebRequest -Method POST -Uri "$domain/api/cron/$_" -UseBasicParsing
}
```

## Alternative: External Cron Service

Use a free external service to trigger your endpoints:

### Option 1: GitHub Actions (FREE)
Create `.github/workflows/cron.yml`:

```yaml
name: Trigger Cron Jobs
on:
  schedule:
    - cron: '0 * * * *'    # Hourly
    - cron: '0 2 * * *'    # Daily at 2 AM
    - cron: '0 3 * * 0'    # Weekly Sunday 3 AM

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger crawl-seed
        run: curl -X POST ${{ secrets.DOMAIN }}/api/cron/crawl-seed
      
      - name: Trigger provenance-tick
        run: curl -X POST ${{ secrets.DOMAIN }}/api/cron/provenance-tick
      
      - name: Trigger avm-train (daily)
        if: github.event.schedule == '0 2 * * *'
        run: curl -X POST ${{ secrets.DOMAIN }}/api/cron/avm-train
      
      - name: Trigger tiles/rebuild (weekly)
        if: github.event.schedule == '0 3 * * 0'
        run: curl -X POST ${{ secrets.DOMAIN }}/api/cron/tiles/rebuild
```

### Option 2: Cron-job.org (FREE)
1. Go to https://cron-job.org
2. Create account
3. Add each endpoint as a separate job
4. Set schedules individually
5. Free tier: unlimited jobs

### Option 3: EasyCron (FREE)
1. Go to https://www.easycron.com
2. Free tier: 100 cron jobs
3. Add each endpoint with desired schedule

### Option 4: Render (FREE)
1. Create free account on Render.com
2. Deploy a simple Node.js cron service
3. Use node-cron to trigger your Vercel endpoints
4. Free tier includes background workers

## Upgrade to Pro ($20/month)

If you upgrade to Vercel Pro:
- **Unlimited cron jobs** ✅
- Faster builds
- More bandwidth
- Team collaboration

Restore all 9 cron jobs in `vercel.json`.

## Recommended Strategy

**For Development/Testing:**
1. Use the 2 enabled cron jobs (crawl-tick, dedup-tick)
2. Manually trigger others as needed
3. Good enough for low-traffic testing

**For Production:**
Choose one:
- **Best**: Upgrade to Vercel Pro ($20/month)
- **Free**: Use GitHub Actions for cron orchestration
- **Free**: Use cron-job.org for external triggers
- **DIY**: Deploy cron service on free Render.com

## Current Configuration

✅ `vercel.json` now has only 2 cron jobs (Hobby limit)
✅ All cron endpoints still exist and work
✅ You can call them manually or via external service
✅ Deployment should now succeed

## Testing After Deployment

1. **Verify deployment succeeds** (should be green now)
2. **Test automatic cron** (wait 5 min for crawl-tick)
3. **Test manual trigger**:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/cron/avm-train
   ```
4. **Check cron execution** in Vercel dashboard → Cron section

## Next Steps

1. **Deploy and verify** build succeeds
2. **Choose cron strategy** (manual, GitHub Actions, or upgrade)
3. **Implement chosen strategy**
4. **Monitor cron execution** in Vercel logs
