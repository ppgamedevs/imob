# Vercel Deployment Troubleshooting

## Current Status

- ✅ Build works locally (successful)
- ✅ Latest commits pushed to main (e0a796f)
- ⚠️ Vercel showing deployment errors (see screenshot)

## Why Deployments Are Failing

Based on your screenshot, all recent deployments show "Error" status. Common causes:

### 1. **Database Connection Issue**

**Symptom**: Build fails during Prisma Client generation
**Solution**: Check Vercel environment variables

- Go to Vercel Dashboard → Settings → Environment Variables
- Verify `DATABASE_URL` is set for Production
- Should point to your Neon.tech connection string with `?pgbouncer=true&connection_limit=1`

### 2. **Missing Environment Variables**

**Check these are set in Vercel:**

```
DATABASE_URL=postgresql://...neon.tech/neondb?pgbouncer=true&connection_limit=1
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-here
```

### 3. **Build Command Issues**

**Vercel should use:**

- Build Command: `npm run build` or `next build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. **Prisma Migration Not Applied**

**If deployment fails with "Table doesn't exist":**

```bash
# Run on your local machine:
npx prisma migrate deploy
```

Or add this to Vercel build command:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## Steps to Fix Deployments

### Step 1: Check Build Logs

1. Go to Vercel Dashboard
2. Click on any failed deployment (red dot)
3. Look for error message in build logs
4. Common errors:
   - "Cannot find module '@prisma/client'" → Need to regenerate
   - "P1001: Can't reach database" → DATABASE_URL wrong
   - "Table 'Analysis' doesn't exist" → Run migrations

### Step 2: Verify Environment Variables

```
Vercel Dashboard → Your Project → Settings → Environment Variables

Required:
✓ DATABASE_URL (Production, Preview, Development)
✓ NEXTAUTH_URL (Production)
✓ NEXTAUTH_SECRET (All environments)

Optional:
- DISALLOWED_DOMAINS
- Any other API keys
```

### Step 3: Force Redeploy

**Option A: Via Dashboard**

1. Go to Deployments tab
2. Find latest deployment
3. Click "..." → "Redeploy"

**Option B: Via Git** (already done)

```bash
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin main
```

### Step 4: Check Vercel Project Settings

```
Settings → General:
- Framework Preset: Next.js
- Node.js Version: 18.x or 20.x
- Root Directory: imob-ro (or leave blank if repo root)

Settings → Build & Development:
- Build Command: npm run build
- Output Directory: .next
- Install Command: npm install
```

## How to Read the Deployment

Looking at your screenshot:

```
3OLumUMz  ✓ Ready     (commit 34534a8) ← Last successful deployment
All above: ● Error     ← These failed to build
```

**This means:**

- Commits after `34534a8` introduced build errors
- OR environment variables changed
- OR database connection issue

## Check Specific Commits

**To find what broke:**

```bash
# See what changed in failing commits
git log --oneline 34534a8..HEAD

# Compare files
git diff 34534a8 HEAD
```

**Our recent commits:**

- `e0a796f` - Empty commit (trigger deployment)
- `76ebb99` - Fix vercel.json cron paths
- `60061e1` - Fix TypeScript errors
- `1f295ff` - Backend stability features
- `bdb41e2` - Day 36 widgets
- `34534a8` - Last successful deployment ✓

## Most Likely Issue

Given the timing, the issue is probably:

### **New Prisma Models Not Migrated**

The backend stability commit added:

- ApiKey model
- ApiUsage model
- EmbedUsage model
- contentHash field

**Solution:**

1. Make sure migration ran on Neon.tech
2. Check Neon.tech Dashboard → Migrations tab
3. Should see: `20251023175518_add_content_hash_and_indices`

**If migration is missing:**

```bash
# Connect to production database
npx prisma migrate deploy
```

Or add to package.json:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "vercel-build": "prisma migrate deploy && prisma generate && next build"
  }
}
```

## Quick Fix Package.json

Let me add the vercel-build script to handle Prisma automatically.

## Testing After Fix

Once deployment succeeds:

1. **Check deployment shows "Ready"** (green checkmark)
2. **Visit your site**: https://your-domain.vercel.app
3. **Test public API**: /api/public/estimate
4. **Check widgets load**: /widgets
5. **Verify cron jobs**: Settings → Cron Jobs (if Pro tier)

## Monitor Next Deployment

After the empty commit push (`e0a796f`):

1. Refresh Vercel dashboard
2. New deployment should appear at top
3. Watch build logs in real-time
4. If it fails again, click deployment → "Build Logs" → Copy error message

---

**Next Steps:**

1. ✅ Empty commit pushed to trigger webhook
2. ⏳ Wait 1-2 minutes for Vercel to start building
3. 📊 Check Vercel dashboard for new deployment
4. 🔍 If still failing, check build logs for specific error
5. 📝 Share error message if you need help debugging
