# Vercel Deployment Fix Guide

## Current Issue
All deployments showing Error status since commit 34534a8. Local builds work fine.

## Root Cause Analysis

Based on the recent changes, there are **2 likely causes**:

### 1. Database Migration Not Applied (MOST LIKELY)

The Day 36 commit added new tables that might not exist in production:
- `ApiKey` (for public API authentication)
- `ApiUsage` (for API usage tracking)
- `EmbedUsage` (for widget analytics)

**Migration**: `20251023174040_add_api_keys_and_embed_usage`

### 2. Prisma Client Generation Failing

The `vercel-build` script runs:
```json
"vercel-build": "prisma generate && prisma migrate deploy && next build"
```

If Prisma generation fails, the entire build fails.

## Quick Diagnostic

### Step 1: Check Build Logs
1. Go to Vercel Dashboard → Deployments
2. Click on latest deployment (commit `e0a796f` or `76ebb99`)
3. Click "Building" or "Error" tab
4. Look for these specific errors:

**Error Pattern A: Missing Tables**
```
Invalid `prisma.apiKey.create()` invocation:
  The table `public.ApiKey` does not exist in the current database
```
**Fix**: Migration not applied → See Fix #1 below

**Error Pattern B: Database Connection**
```
P1001: Can't reach database server at `...`
Please make sure your database server is running at `...`
```
**Fix**: DATABASE_URL incorrect → See Fix #2 below

**Error Pattern C: Prisma Generation**
```
Error: Generator "client" failed:
...
```
**Fix**: Prisma version mismatch → See Fix #3 below

## Fixes

### Fix #1: Apply Missing Migration to Production

**Option A: Automatic (via Vercel Build)**
The `vercel-build` script should handle this, but if it's failing:

1. Check Vercel build logs for the exact error
2. If you see "Migration failed", the issue is database connection or permissions

**Option B: Manual Migration**
Connect to your Neon database and run:

```bash
# Locally, with production DATABASE_URL
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

**Option C: Reset Vercel Cache**
Sometimes Vercel's build cache causes issues:

1. Vercel Dashboard → Settings → General
2. Scroll to "Build & Development Settings"
3. Click "Clear Build Cache & Redeploy"

### Fix #2: Verify Environment Variables

Go to Vercel Dashboard → Settings → Environment Variables

**Required Variables:**
```env
DATABASE_URL=postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key
```

**Important Notes:**
- `DATABASE_URL` must include `?pgbouncer=true&connection_limit=1` for Vercel
- All variables must be set for **Production**, **Preview**, and **Development**
- After adding/changing variables, **redeploy** from Vercel dashboard

### Fix #3: Force Fresh Build

If the build is using stale cache:

```bash
# Create another empty commit
git commit --allow-empty -m "Force fresh Vercel build"
git push origin main
```

Then in Vercel:
1. Wait 30 seconds for webhook
2. Deployment should start automatically
3. Watch build logs in real-time

### Fix #4: Check Prisma Version Mismatch

In your `package.json`, ensure Prisma versions match:

```json
{
  "dependencies": {
    "@prisma/client": "6.17.1"
  },
  "devDependencies": {
    "prisma": "6.17.1"  // MUST MATCH
  }
}
```

If they don't match:
```bash
pnpm add -D prisma@6.17.1
git commit -am "Fix Prisma version mismatch"
git push origin main
```

## Testing After Fix

Once deployment succeeds (green checkmark), verify:

### 1. Site Loads
```bash
curl -I https://your-domain.vercel.app
# Should return: HTTP/2 200
```

### 2. Database Tables Exist
In Neon.tech SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ApiKey', 'ApiUsage', 'EmbedUsage', 'Analysis');
```
Should return 4 rows.

### 3. New contentHash Field
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Analysis' 
  AND column_name = 'contentHash';
```
Should return: `contentHash | text`

### 4. Indices Created
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'Analysis' 
  AND indexname LIKE '%contentHash%';
```
Should return: `Analysis_contentHash_idx`

## Next Steps After Successful Deployment

1. **Test Idempotency**: Submit same listing twice → should return `cached: true`
2. **Test Rate Limiting**: Send 31 requests in 1 minute → 31st should return 429
3. **Test Public API**: Generate API key → test endpoints
4. **Verify Cron Jobs**: Check Vercel dashboard (requires Pro tier)

## Contact Points

If still failing after these fixes, share:
1. **Full build log** from Vercel (copy entire log)
2. **Environment variables** (names only, no values)
3. **Database connection test** result from Neon dashboard
4. **Latest commit hash** being deployed

## Common Gotchas

❌ **Don't**: Run `prisma migrate dev` in production
✅ **Do**: Use `prisma migrate deploy` for production

❌ **Don't**: Set `DATABASE_URL` without `?pgbouncer=true`
✅ **Do**: Always include `?pgbouncer=true&connection_limit=1`

❌ **Don't**: Skip environment variables in Preview/Development
✅ **Do**: Set variables for all environments

❌ **Don't**: Ignore Vercel build cache
✅ **Do**: Clear cache if experiencing weird issues
