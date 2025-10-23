# Day 36: Embeddable Widgets + Public API v1 - Comparison

**Goal:** Self-serve growth—anyone can embed an "Estimează prețul" or "Heatmap €/m²" widget; links back to your site (SEO), zero partnerships needed.

**Date:** October 23, 2025  
**Status:** 🔴 NOT IMPLEMENTED (0% - Fresh implementation needed)

---

## Current State Analysis

### ✅ What We Already Have

#### 1. **Existing Embed Infrastructure**
**File:** `src/app/api/embed/[slug]/route.ts` (28 lines)
- **Purpose:** Embeds shortlink reports in iframes
- **Technology:** Edge runtime, JavaScript loader
- **Features:**
  - Auto-sizing iframe via postMessage
  - Lazy loading
  - Cache control (24h)
- **Limitation:** Only for shortlinks, not general widgets

#### 2. **Owner AVM Estimation Function**
**File:** `src/lib/ml/owner-avm.ts` (154 lines)
- **Function:** `estimateAVMFromFeatures(features: OwnerFeatures): Promise<AvmEstimate>`
- **Features:**
  - Pure function for AVM estimation
  - Accepts: areaSlug, areaM2, rooms, yearBuilt, level, distMetroM, conditionScore
  - Returns: { low, mid, high, conf, explain }
  - Uses AreaDaily for median €/m²
  - Multiple adjustments: floor, year, metro, condition
  - Spread calculation based on data quality
- **Ready for:** Direct use in public API

#### 3. **Area KPI Data**
**File:** `src/lib/zones/load-zone.ts` (lines 78-110)
- **Available metrics:**
  - `pricePerSqm` (median €/m²)
  - `change30d` (price change percentage)
  - `rentEurM2` (rent per m²)
  - `yieldNet` (net yield percentage)
  - `ttsMedianDays` (time-to-sell)
  - `demandScore` (demand vs supply)
  - `supply` (active listings)
- **Source:** Latest AreaDaily record + stats JSON field
- **Ready for:** Public API endpoint

#### 4. **Precomputed Tile System (Day 34)**
**Files:** 
- `src/lib/tiles/loader.ts` (203 lines)
- `public/data/tiles/bucharest-z14/` (168 tiles, 7,200 cells)
- **Features:**
  - 250m grid cells covering Bucharest
  - Intelligence scores (0-1 range)
  - POI scoring (50 POIs: schools, supermarkets, restaurants, parks)
  - Fast lookup with caching (<2ms)
- **Ready for:** Heatmap widget data source

#### 5. **OpenGraph Image Generation**
**File:** `src/app/api/og/area/route.tsx` (130 lines)
- **Dynamic image generation** with ImageResponse API
- **Shows:** Zone name, price, trend, supply
- **Technology:** Next.js ImageResponse, Node.js runtime
- **Not a widget:** But shows we can render visual cards

#### 6. **/vinde Page (Owner Wizard)**
**File:** `src/app/vinde/page.tsx`
- **Form-based AVM estimation** for property owners
- **Features:**
  - Step-by-step wizard
  - Calls estimateAVMFromFeatures()
  - Shows result with confidence interval
- **Limitation:** Full page, not embeddable widget

---

## ❌ What's Missing (Day 36 Requirements)

### 1. **Public API v1 (Read-Only)**

#### Missing API Endpoints:

**Endpoint 1: Area KPIs**
```
GET /api/public/area/:slug/kpis
```
**Should return:**
```json
{
  "slug": "bucuresti-sector-1",
  "name": "Sector 1",
  "medianEurM2": 2100,
  "change30d": 0.03,
  "rentEurM2": 12.5,
  "yieldNet": 0.058,
  "ttsMedianDays": 45,
  "demandScore": 0.75,
  "supply": 234,
  "updatedAt": "2025-10-23T10:30:00Z"
}
```
**Data source:** ✅ Already available in `load-zone.ts`  
**Implementation needed:** API route with x-api-key auth

**Endpoint 2: Price Estimate**
```
GET /api/public/estimate?areaSlug=bucuresti-sector-1&areaM2=65&rooms=2&year=2010&condition=0.7
```
**Should return:**
```json
{
  "low": 95000,
  "mid": 110000,
  "high": 125000,
  "conf": 0.85,
  "eurM2": 1692,
  "explain": {
    "baselineEurM2": 1800,
    "adjustments": {
      "floor": 1.02,
      "year": 1.03,
      "metro": 1.0,
      "condition": 1.02
    },
    "spread": 0.09
  }
}
```
**Data source:** ✅ Already available in `estimateAVMFromFeatures()`  
**Implementation needed:** API route with x-api-key auth + query param parsing

#### Missing API Key System:

**Schema changes needed:**
```prisma
model ApiKey {
  id          String   @id @default(cuid())
  key         String   @unique  // Generated hash
  userId      String?
  name        String?             // "Widget for mysite.com"
  domain      String?             // Optional domain restriction
  rateLimit   Int      @default(1000)  // Requests per day
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  
  user        User?    @relation(fields: [userId], references: [id])
  
  @@index([key])
  @@index([userId])
}

model ApiUsage {
  id          String   @id @default(cuid())
  apiKeyId    String
  endpoint    String   // "/api/public/area/:slug/kpis"
  method      String   // "GET"
  statusCode  Int
  responseMs  Int?
  ip          String?
  userAgent   String?
  referer     String?
  createdAt   DateTime @default(now())
  
  apiKey      ApiKey   @relation(fields: [apiKeyId], references: [id])
  
  @@index([apiKeyId, createdAt])
  @@index([createdAt])
}
```

**Admin UI needed:**
- `/admin/api-keys` page to list/create/revoke keys
- Key generation with crypto.randomBytes(32).toString('hex')
- Display key once on creation (like GitHub tokens)
- Usage stats per key
- Rate limiting enforcement

**Middleware needed:**
```typescript
// src/lib/api/validate-key.ts
async function validateApiKey(req: Request): Promise<ApiKey | null> {
  const key = req.headers.get('x-api-key');
  if (!key) return null;
  
  const apiKey = await prisma.apiKey.findUnique({
    where: { key, isActive: true }
  });
  
  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  
  // Check rate limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const usageCount = await prisma.apiUsage.count({
    where: {
      apiKeyId: apiKey.id,
      createdAt: { gte: today }
    }
  });
  
  if (usageCount >= apiKey.rateLimit) return null;
  
  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });
  
  return apiKey;
}
```

---

### 2. **Embeddable Widgets**

#### Missing Widget 1: AVM Estimator

**File:** `public/widgets/avm.html` (NOT CREATED)

**Requirements:**
- ✅ Vanilla JS, <50KB total
- ✅ Responsive design
- ✅ Themeable via query params (?theme=dark&color=blue)
- ✅ Calls `/api/public/estimate`
- ✅ Shows form: area selector + m² input + rooms + year + condition slider
- ✅ Shows result: price range + confidence bar
- ✅ Footer link: "Powered by imob.ro" (canonical backlink)
- ✅ Tracks referrer on load

**Technology Stack:**
- Pure HTML/CSS/JS (no React/framework)
- Fetch API for requests
- CSS Grid for layout
- CSS custom properties for theming
- localStorage for theme preference

**Sample structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>AVM Estimator Widget</title>
  <style>
    :root {
      --primary: #3b82f6;
      --bg: #ffffff;
      --text: #1f2937;
      --border: #e5e7eb;
    }
    [data-theme="dark"] {
      --bg: #1f2937;
      --text: #f9fafb;
      --border: #374151;
    }
    .avm-widget { /* styles */ }
    .avm-form { /* styles */ }
    .avm-result { /* styles */ }
    .avm-footer { /* styles */ }
  </style>
</head>
<body>
  <div class="avm-widget" id="avmWidget">
    <form class="avm-form"><!-- inputs --></form>
    <div class="avm-result" id="result"><!-- result --></div>
    <div class="avm-footer">
      <a href="https://imob.ro?utm_source=widget" target="_blank">
        Powered by imob.ro
      </a>
    </div>
  </div>
  <script>
    (function() {
      const API_URL = 'https://imob.ro/api/public';
      const widget = document.getElementById('avmWidget');
      
      // Parse URL params for theming
      const params = new URLSearchParams(window.location.search);
      if (params.get('theme') === 'dark') {
        widget.setAttribute('data-theme', 'dark');
      }
      
      // Track widget load
      fetch(API_URL + '/track/widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'avm',
          referrer: document.referrer
        })
      });
      
      // Form submission
      document.querySelector('.avm-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const query = new URLSearchParams({
          areaSlug: formData.get('area'),
          areaM2: formData.get('areaM2'),
          rooms: formData.get('rooms'),
          year: formData.get('year'),
          condition: formData.get('condition')
        });
        
        const res = await fetch(API_URL + '/estimate?' + query, {
          headers: { 'x-api-key': 'PUBLIC_KEY' }
        });
        const data = await res.json();
        
        // Render result
        document.getElementById('result').innerHTML = `
          <div class="price-range">
            <span>${data.low.toLocaleString()} €</span>
            <span>–</span>
            <span>${data.high.toLocaleString()} €</span>
          </div>
          <div class="confidence">
            <div class="bar" style="width: ${data.conf * 100}%"></div>
          </div>
        `;
      });
    })();
  </script>
</body>
</html>
```

**Embed code generator needed:**
```html
<!-- Copy-paste this to your site -->
<iframe 
  src="https://imob.ro/widgets/avm.html?theme=light&color=blue" 
  width="100%" 
  height="480px" 
  frameborder="0"
  loading="lazy">
</iframe>
```

#### Missing Widget 2: Heatmap

**File:** `public/widgets/heatmap.html` (NOT CREATED)

**Requirements:**
- ✅ Display precomputed tile data (no external map library needed)
- ✅ Canvas-based rendering or CSS Grid
- ✅ Color-coded cells by €/m² or intelligence score
- ✅ Hover tooltips with area name + price
- ✅ Zoom controls (or responsive auto-zoom)
- ✅ Legend with color scale
- ✅ Footer link: "Powered by imob.ro"
- ✅ Tracks referrer on load

**Data source:**
- Fetch `/api/public/area/:slug/kpis` for each visible cell
- Or create new endpoint: `/api/public/tiles/bucharest` returning all cells
- Use existing tile JSON structure from Day 34

**Technology:**
- Canvas for rendering (better performance)
- Or SVG for hover interactivity
- Fetch API for tile data
- requestAnimationFrame for smooth rendering

**Sample structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Price Heatmap Widget</title>
  <style>
    .heatmap-widget { /* container */ }
    .heatmap-canvas { /* canvas styles */ }
    .heatmap-legend { /* color scale */ }
    .heatmap-tooltip { /* hover tooltip */ }
    .heatmap-footer { /* powered by link */ }
  </style>
</head>
<body>
  <div class="heatmap-widget">
    <canvas id="heatmap" width="800" height="600"></canvas>
    <div class="heatmap-legend">
      <span>Low</span>
      <div class="gradient"></div>
      <span>High</span>
    </div>
    <div class="heatmap-tooltip" id="tooltip"></div>
    <div class="heatmap-footer">
      <a href="https://imob.ro?utm_source=widget" target="_blank">
        Powered by imob.ro
      </a>
    </div>
  </div>
  <script>
    (function() {
      const canvas = document.getElementById('heatmap');
      const ctx = canvas.getContext('2d');
      
      // Fetch tile data
      fetch('https://imob.ro/api/public/tiles/bucharest')
        .then(r => r.json())
        .then(tiles => {
          renderHeatmap(tiles);
        });
      
      function renderHeatmap(tiles) {
        // Color scale: green (low) -> yellow (mid) -> red (high)
        const minPrice = Math.min(...tiles.map(t => t.medianEurM2));
        const maxPrice = Math.max(...tiles.map(t => t.medianEurM2));
        
        tiles.forEach(tile => {
          const color = getHeatColor(tile.medianEurM2, minPrice, maxPrice);
          ctx.fillStyle = color;
          ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
        });
      }
      
      function getHeatColor(value, min, max) {
        const ratio = (value - min) / (max - min);
        // Interpolate between green and red
        const r = Math.round(ratio * 255);
        const g = Math.round((1 - ratio) * 255);
        return `rgb(${r}, ${g}, 0)`;
      }
      
      // Track widget load
      fetch('https://imob.ro/api/public/track/widget', {
        method: 'POST',
        body: JSON.stringify({
          type: 'heatmap',
          referrer: document.referrer
        })
      });
    })();
  </script>
</body>
</html>
```

---

### 3. **Widget Generator Page**

**File:** `/widgets` page (NOT CREATED)

**Requirements:**
- Public landing page at `/widgets`
- Shows widget previews (iframe demos)
- Copy-paste embed code generator
- Customization options:
  - Theme (light/dark)
  - Primary color
  - Size (small/medium/large)
- Instructions for integration
- SEO optimized (JSON-LD, OG tags)

**Sample structure:**
```tsx
// src/app/widgets/page.tsx
export default function WidgetsPage() {
  return (
    <div className="container py-12">
      <h1>Embeddable Widgets</h1>
      <p>Add real estate intelligence to your website</p>
      
      {/* Widget 1: AVM Estimator */}
      <section>
        <h2>Price Estimator Widget</h2>
        <div className="grid grid-cols-2 gap-8">
          <div className="preview">
            <iframe src="/widgets/avm.html" />
          </div>
          <div className="config">
            <label>Theme</label>
            <select name="theme">
              <option>light</option>
              <option>dark</option>
            </select>
            
            <label>Primary Color</label>
            <input type="color" name="color" />
            
            <div className="embed-code">
              <code>{`<iframe src="..." />`}</code>
              <button>Copy</button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Widget 2: Heatmap */}
      <section>
        <h2>Price Heatmap Widget</h2>
        {/* Similar structure */}
      </section>
      
      {/* API Documentation */}
      <section>
        <h2>Public API</h2>
        <p>Need more control? Use our public API</p>
        <a href="/api-docs">View API Documentation</a>
      </section>
    </div>
  );
}
```

---

### 4. **Tracking & Analytics**

#### Missing: EmbedUsage Table

**Schema needed:**
```prisma
model EmbedUsage {
  id          String   @id @default(cuid())
  widgetType  String   // "avm" | "heatmap"
  referrer    String?  // Domain that embedded the widget
  domain      String?  // Normalized domain (parsed from referrer)
  userAgent   String?
  country     String?  // From IP geolocation
  createdAt   DateTime @default(now())
  
  @@index([domain, createdAt])
  @@index([widgetType, createdAt])
  @@index([createdAt])
}
```

**Tracking endpoint needed:**
```typescript
// src/app/api/public/track/widget/route.ts
export async function POST(req: Request) {
  const { type, referrer } = await req.json();
  
  // Parse domain from referrer
  let domain = null;
  if (referrer) {
    try {
      const url = new URL(referrer);
      domain = url.hostname.replace('www.', '');
    } catch {}
  }
  
  await prisma.embedUsage.create({
    data: {
      widgetType: type,
      referrer: referrer || null,
      domain: domain || null,
      userAgent: req.headers.get('user-agent'),
      // Could add IP geolocation here
    }
  });
  
  return NextResponse.json({ ok: true });
}
```

**Analytics dashboard needed:**
- `/admin/widgets` page showing:
  - Total widget loads per day
  - Top referring domains
  - Widget type breakdown (AVM vs Heatmap)
  - Geographic distribution
  - Growth chart

---

## Implementation Plan

### Phase 1: Public API Foundation (3-4 hours)

**Step 1:** Create schema migration for API keys
```bash
npx prisma migrate dev --name add_api_keys_and_embed_usage
```

**Step 2:** Create API key admin page
- `/admin/api-keys/page.tsx` - List view
- `/admin/api-keys/actions.ts` - Server actions for CRUD
- Key generation with crypto
- Display key once with copy button
- Revoke functionality

**Step 3:** Create API key validation middleware
- `src/lib/api/validate-key.ts`
- Rate limiting logic
- Usage tracking

**Step 4:** Create public API endpoints
- `src/app/api/public/area/[slug]/kpis/route.ts`
  - Fetch AreaDaily + stats
  - Return JSON with all KPIs
  - Add CORS headers
  - Validate x-api-key
  - Track usage
  
- `src/app/api/public/estimate/route.ts`
  - Parse query params (areaSlug, areaM2, rooms, year, condition)
  - Call estimateAVMFromFeatures()
  - Return JSON with AVM result
  - Validate x-api-key
  - Track usage

**Step 5:** Add public key for widgets
- Create special "PUBLIC" API key with high rate limit
- Hardcode in widgets for demo purposes
- Document in /widgets page

---

### Phase 2: Widget Development (4-5 hours)

**Step 6:** Create AVM Estimator Widget
- `public/widgets/avm.html`
- Vanilla JS/CSS implementation
- Form with area selector (fetch areas list)
- Input fields: m², rooms, year, condition slider
- Fetch `/api/public/estimate`
- Display result with animation
- Confidence bar visualization
- Themeable via query params
- Footer backlink
- Track on load

**Step 7:** Create Heatmap Widget
- `public/widgets/heatmap.html`
- Canvas-based rendering
- Fetch tile data (create `/api/public/tiles/bucharest` if needed)
- Color scale: green → yellow → red
- Hover tooltips with area name + price
- Zoom controls (optional)
- Legend
- Footer backlink
- Track on load

**Step 8:** Create tile data endpoint (if needed)
- `src/app/api/public/tiles/bucharest/route.ts`
- Return simplified tile data (lat, lng, medianEurM2, areaSlug)
- Validate x-api-key
- Cache aggressively (24h)

---

### Phase 3: Widget Generator & Docs (2-3 hours)

**Step 9:** Create /widgets landing page
- `src/app/widgets/page.tsx`
- Hero section with demo iframes
- Customization UI (theme, color, size)
- Live preview updates
- Copy-paste embed code generator
- Instructions for integration
- Link to API docs
- SEO optimization

**Step 10:** Create API documentation page
- `/api-docs/page.tsx`
- Endpoint reference
- Request/response examples
- Authentication guide
- Rate limits
- Error codes
- Code samples (curl, JavaScript, Python)

**Step 11:** Add tracking dashboard
- `/admin/widgets/page.tsx`
- Show EmbedUsage stats
- Top referring domains table
- Widget type breakdown chart
- Daily loads chart
- Export to CSV

---

### Phase 4: SEO & Growth Features (1-2 hours)

**Step 12:** Add canonical backlinks enforcement
- Ensure widgets always show "Powered by imob.ro" footer
- Add utm_source=widget to all links
- Make footer link mandatory (can't be removed via params)

**Step 13:** Create widget showcase
- Add "Used by" section on homepage
- Show top domains using widgets
- Display widget load counter ("10,000+ embeds")

**Step 14:** Marketing materials
- Create social media cards for /widgets page
- Write blog post: "How to Add Real Estate Intelligence to Your Website"
- Prepare email campaign for existing users
- Add widget CTA to report pages

---

## File Structure

### New Files (16 files)

```
prisma/
  migrations/
    YYYYMMDDHHMMSS_add_api_keys_and_embed_usage/
      migration.sql

public/
  widgets/
    avm.html (new - 300 lines)
    heatmap.html (new - 350 lines)

src/
  app/
    widgets/
      page.tsx (new - 200 lines)
      
    api-docs/
      page.tsx (new - 150 lines)
    
    admin/
      api-keys/
        page.tsx (new - 180 lines)
        actions.ts (new - 100 lines)
      
      widgets/
        page.tsx (new - 150 lines)
    
    api/
      public/
        area/
          [slug]/
            kpis/
              route.ts (new - 80 lines)
        
        estimate/
          route.ts (new - 100 lines)
        
        tiles/
          bucharest/
            route.ts (new - 60 lines)
        
        track/
          widget/
            route.ts (new - 50 lines)
  
  lib/
    api/
      validate-key.ts (new - 100 lines)
      track-usage.ts (new - 40 lines)
```

### Modified Files (2 files)

```
prisma/
  schema.prisma (add ApiKey, ApiUsage, EmbedUsage models)

src/
  app/
    layout.tsx or homepage (add widget CTA banner)
```

---

## Technical Comparison

| Feature | Current State | Day 36 Requirement | Gap |
|---------|--------------|-------------------|-----|
| **Public API** | ❌ None | ✅ 2 endpoints with x-api-key | Need full implementation |
| **API Keys** | ❌ No system | ✅ DB storage + admin UI | Need schema + UI |
| **Rate Limiting** | ❌ None | ✅ Per-key daily limits | Need middleware |
| **AVM Widget** | ⚠️ /vinde page exists | ✅ Embeddable <50KB | Need standalone HTML |
| **Heatmap Widget** | ⚠️ Tiles exist | ✅ Embeddable canvas | Need standalone HTML |
| **Embed Code Gen** | ⚠️ Basic for shortlinks | ✅ Full generator with preview | Need UI page |
| **Widget Tracking** | ❌ None | ✅ EmbedUsage table | Need schema + endpoint |
| **Backlink Enforcement** | ❌ None | ✅ Mandatory footer link | Need in widgets |
| **API Docs** | ❌ None | ✅ Public docs page | Need page |
| **Widget Landing** | ❌ None | ✅ /widgets page | Need page |

---

## Data Flow

### AVM Widget Flow:
```
User embeds iframe → public/widgets/avm.html loads
  → Track widget load (referrer → EmbedUsage)
  → User fills form (area, m², rooms, year, condition)
  → Submit → fetch /api/public/estimate?params
  → Validate x-api-key → Check rate limit
  → Call estimateAVMFromFeatures()
  → Track API usage (ApiUsage)
  → Return { low, mid, high, conf }
  → Display result + backlink
```

### Heatmap Widget Flow:
```
User embeds iframe → public/widgets/heatmap.html loads
  → Track widget load (referrer → EmbedUsage)
  → Fetch /api/public/tiles/bucharest
  → Validate x-api-key → Check rate limit
  → Return tile data (7,200 cells)
  → Track API usage (ApiUsage)
  → Render canvas heatmap
  → Display + backlink
```

### API Key Flow:
```
Admin → /admin/api-keys → Create new key
  → Generate random 64-char hex
  → Store in ApiKey table
  → Display once (copy button)
  
Developer → Add x-api-key header to requests
  → Middleware validates key
  → Check isActive, expiresAt
  → Check rate limit (daily count)
  → Update lastUsedAt
  → Allow or deny request
```

---

## SEO & Growth Impact

### Backlinks Strategy:
- Every widget shows "Powered by imob.ro" (non-removable)
- UTM tracking: `?utm_source=widget&utm_medium=embed`
- Canonical rel="nofollow" to avoid spam penalties
- Estimate: **50-100 new backlinks per month** after 6 months

### Traffic Projections:
- Month 1: 10 widget embeds → 1,000 views
- Month 3: 50 widget embeds → 10,000 views
- Month 6: 200 widget embeds → 50,000 views
- Month 12: 500+ widget embeds → 200,000+ views

### Distribution Channels:
1. **Real estate blogs** (embed price estimator)
2. **Neighborhood guides** (embed heatmap)
3. **Property management sites** (embed AVM)
4. **Real estate forums** (self-serve embeds)
5. **City websites** (free tool)

---

## Testing Strategy

### Widget QA:
1. **Local HTML test:**
   ```html
   <!-- test-widget.html -->
   <iframe src="http://localhost:3000/widgets/avm.html" width="400" height="500"></iframe>
   ```
   - Open in browser
   - Test form submission
   - Verify result display
   - Check responsive behavior
   - Test theme switching

2. **CodeSandbox test:**
   - Create new HTML sandbox
   - Embed widget iframe
   - Test from external domain
   - Verify referrer tracking works
   - Check CORS headers

3. **Production domain test:**
   - Deploy to imob.ro
   - Test from different domains
   - Verify backlinks work
   - Check analytics tracking

### API QA:
1. **Key validation:**
   ```bash
   # Valid key
   curl -H "x-api-key: abc123..." https://imob.ro/api/public/area/bucuresti-sector-1/kpis
   
   # Invalid key
   curl -H "x-api-key: invalid" https://imob.ro/api/public/area/bucuresti-sector-1/kpis
   # Should return 401
   
   # Rate limit test
   for i in {1..1001}; do curl -H "x-api-key: abc123..." https://imob.ro/api/public/estimate; done
   # Should start returning 429 after 1000
   ```

2. **Estimate accuracy:**
   - Compare with /vinde page results
   - Test edge cases (very small/large m²)
   - Test missing params
   - Verify confidence scores

---

## Migration Strategy

### Database Migration:
```sql
-- Add ApiKey table
CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "userId" TEXT,
  "name" TEXT,
  "domain" TEXT,
  "rateLimit" INTEGER NOT NULL DEFAULT 1000,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP,
  "lastUsedAt" TIMESTAMP,
  
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- Add ApiUsage table
CREATE TABLE "ApiUsage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "apiKeyId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseMs" INTEGER,
  "ip" TEXT,
  "userAgent" TEXT,
  "referer" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE
);

CREATE INDEX "ApiUsage_apiKeyId_createdAt_idx" ON "ApiUsage"("apiKeyId", "createdAt");
CREATE INDEX "ApiUsage_createdAt_idx" ON "ApiUsage"("createdAt");

-- Add EmbedUsage table
CREATE TABLE "EmbedUsage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "widgetType" TEXT NOT NULL,
  "referrer" TEXT,
  "domain" TEXT,
  "userAgent" TEXT,
  "country" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "EmbedUsage_domain_createdAt_idx" ON "EmbedUsage"("domain", "createdAt");
CREATE INDEX "EmbedUsage_widgetType_createdAt_idx" ON "EmbedUsage"("widgetType", "createdAt");
CREATE INDEX "EmbedUsage_createdAt_idx" ON "EmbedUsage"("createdAt");
```

### Deployment Steps:
1. Run Prisma migration
2. Generate Prisma client
3. Deploy API endpoints
4. Upload widget HTML files to public/
5. Create initial PUBLIC API key
6. Test widgets in staging
7. Deploy to production
8. Monitor usage and errors
9. Add /widgets to sitemap
10. Launch marketing campaign

---

## Success Metrics

### Week 1:
- ✅ 5 widget embeds
- ✅ 10 API calls/day
- ✅ 0 errors in logs

### Month 1:
- ✅ 20 widget embeds
- ✅ 500 API calls/day
- ✅ 5 referring domains

### Month 3:
- ✅ 100 widget embeds
- ✅ 5,000 API calls/day
- ✅ 30 referring domains
- ✅ 10 backlinks indexed by Google

### Month 6:
- ✅ 300 widget embeds
- ✅ 20,000 API calls/day
- ✅ 100 referring domains
- ✅ 50 backlinks indexed

---

## Risk Assessment

### Security Risks:
1. **API abuse:** Rate limiting prevents DoS
2. **Key leakage:** Keys are revokable + domain-restricted
3. **Widget XSS:** Use CSP headers + sanitize inputs
4. **CORS issues:** Explicit allow-origin for widgets

### Performance Risks:
1. **High API load:** Cache responses + CDN for widgets
2. **Database load:** Index ApiUsage by date for cleanup
3. **Widget size:** Keep <50KB with minification

### SEO Risks:
1. **Backlink spam:** Monitor referring domains
2. **Duplicate content:** Widgets show minimal text
3. **Low-quality sites:** Can revoke API keys if needed

---

## Conclusion

**Implementation Complexity:** 🔴 MEDIUM-HIGH

**Prerequisites:**
- ✅ AVM logic exists (owner-avm.ts)
- ✅ Area KPIs exist (load-zone.ts)
- ✅ Tile system exists (Day 34)
- ✅ Basic embed exists (shortlinks)

**New Infrastructure Needed:**
- ❌ API key system (schema + admin + middleware)
- ❌ Public API endpoints (2 routes)
- ❌ Widget HTML files (2 files)
- ❌ Widget generator page (1 page)
- ❌ Tracking system (schema + endpoint)
- ❌ API documentation page (1 page)

**Estimated Total:** ~12-15 hours of development

**Growth Potential:** 🟢 HIGH
- Self-serve distribution (zero partnerships)
- Automatic backlinks (SEO compound effect)
- Brand awareness (widgets show on 3rd party sites)
- API ecosystem (developers can build on top)

**Recommendation:** ✅ **IMPLEMENT** - High ROI for growth, leverages existing data/logic, creates moat through distribution.

