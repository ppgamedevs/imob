# Day 35: Personalization Engine - Current vs Planned Comparison

## Executive Summary

**Current State:** Basic recommendations based on underpriced + fast TTS heuristics, no user preference tracking  
**Planned State:** Full personalization engine with taste tracking, decay-weighted preferences, and intelligent ranking based on user behavior

---

## Detailed Comparison

### 1. Current User Preference Tracking

#### **Existing Infrastructure:**

**BuyerEvent Table** (prisma/schema.prisma line 874):
```prisma
model BuyerEvent {
  id        String   @id @default(cuid())
  userId    String
  kind      String   // "saved_search_run" | "watch_price_drop" | "compare_open" | "mortgage_calc"
  meta      Json?
  ts        DateTime @default(now())
  
  @@index([userId, ts])
}
```

**Current Event Types:**
- `saved_search_run` - When user runs a saved search
- `watch_price_drop` - When a watched property drops in price
- `compare_open` - When user opens comparison page
- `mortgage_calc` - When user uses mortgage calculator

**Current Tracking (ReportTracker.tsx):**
```tsx
// Tracks area-level events (not user-specific)
- view_report
- save_report  
- share_pdf
// Goes to /api/track, updates AreaEvent (not BuyerEvent)
```

**Existing BuyerEvent Usage:**
1. `src/lib/saved-search/run.ts` - Logs `saved_search_run`
2. `src/app/compare/[id]/page.tsx` - Logs `compare_open`

#### **Issues:**
❌ No tracking of property views (report page visits)  
❌ No dwell time tracking (time spent on property)  
❌ No watch item additions tracked in BuyerEvent  
❌ Events not tied to specific properties/groups  
❌ No unified event for recommendation scoring  
❌ AreaEvent and BuyerEvent are separate (should merge or connect)

---

### 2. Current Recommendation System

**Current Implementation** (`/me/buyer/page.tsx` lines 77-102):
```tsx
// Get recommendations (simple heuristic: underpriced + fast TTS)
const recommendations = await prisma.analysis.findMany({
  where: {
    // Basic filters - can be enhanced with user preferences
  },
  include: {
    featureSnapshot: true,
    scoreSnapshot: true,
    extractedListing: true,
    group: true,
  },
  orderBy: { createdAt: "desc" },
  take: 6,
});

// Filter recommendations: underpriced + fast TTS
const goodDeals = recommendations.filter((a) => {
  const s = a.scoreSnapshot as any;
  const underpriced = s?.value?.priceBadge === "underpriced";
  const fastTTS = s?.tts?.bucket === "fast";
  return underpriced || fastTTS;
});
```

**Current Ranking:**
- ❌ No personalization (same for all users)
- ❌ Only uses price badge + TTS bucket
- ❌ No area preference matching
- ❌ No price band matching
- ❌ No room count preferences
- ❌ No recency weighting
- ❌ Simple `orderBy: { createdAt: "desc" }`
- ✅ Shows underpriced properties
- ✅ Shows fast-selling properties

**Display Section:**
- Section title: "Recommended for You" (misleading - not personalized)
- Description: "Properties with great value or fast selling potential"
- Shows up to 6 properties
- Basic card layout with photo, price, badges

---

### 3. Planned Personalization Engine

#### **New UserTaste Table:**

```prisma
model UserTaste {
  id          String   @id @default(cuid())
  userId      String   @unique
  
  // Area preferences (JSON array of {areaSlug, score, lastSeen})
  areas       Json?    // [{slug: "bucuresti-sector-1", score: 0.8, ts: "2025-10-23T..."}]
  
  // Price band preferences
  minPrice    Int?     // Minimum price seen/searched (EUR)
  maxPrice    Int?     // Maximum price seen/searched (EUR)
  
  // Room preferences (JSON object {1: 0.1, 2: 0.5, 3: 0.8, 4: 0.2})
  rooms       Json?    // {roomCount: preferenceScore}
  
  // Property type preferences
  types       Json?    // {apartment: 0.9, house: 0.2}
  
  // Last updated timestamp
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
  
  @@index([userId])
}
```

**Decay Logic:**
- 7-day half-life: `weight = 0.5^(daysSince / 7)`
- Events >30 days old contribute minimally
- Recent behavior dominates recommendations
- Formula: `score = Σ(event_weight * decay_factor)`

---

#### **Enhanced BuyerEvent Types:**

**New Event Types to Add:**
```typescript
type BuyerEventKind =
  // Existing
  | "saved_search_run"
  | "watch_price_drop"
  | "compare_open"
  | "mortgage_calc"
  // New (Day 35)
  | "view_property"         // View report page
  | "dwell_property"        // Spent >15s on property
  | "add_to_watch"          // Added to watchlist
  | "discover_card_click"   // Clicked property card in discover
  | "search_filters"        // Applied search filters
```

**Enhanced Meta Structure:**
```typescript
type BuyerEventMeta = {
  // Property context
  groupId?: string;         // DedupGroup ID
  analysisId?: string;      // Analysis ID
  areaSlug?: string;        // Area slug
  
  // Property details
  priceEur?: number;        // Price in EUR
  areaM2?: number;          // Square meters
  rooms?: number;           // Room count
  city?: string;            // City
  
  // Behavior context
  dwellSeconds?: number;    // Time spent (for dwell_property)
  source?: string;          // Where event originated (discover, search, direct)
  
  // Search context (for search_filters)
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    rooms?: number[];
    areas?: string[];
  };
};
```

---

#### **Taste Update Logic** (src/lib/reco/taste.ts):

```typescript
/**
 * Day 35: User Taste Tracking
 * Updates user preferences based on behavior events
 */

type TasteUpdate = {
  userId: string;
  eventKind: string;
  eventTs: Date;
  meta: {
    groupId?: string;
    areaSlug?: string;
    priceEur?: number;
    rooms?: number;
    dwellSeconds?: number;
  };
};

/**
 * Weight multipliers for different event types
 */
const EVENT_WEIGHTS = {
  view_property: 1.0,
  dwell_property: 3.0,      // 3x weight for >15s dwell
  add_to_watch: 5.0,        // 5x weight for adding to watchlist
  discover_card_click: 0.5, // Lower weight for quick clicks
  search_filters: 2.0,      // 2x weight for deliberate filtering
};

/**
 * Calculate decay factor (7-day half-life)
 */
function getDecayFactor(eventTs: Date): number {
  const now = new Date();
  const daysSince = (now.getTime() - eventTs.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, daysSince / 7);
}

/**
 * Update user taste based on event
 */
export async function updateUserTaste(update: TasteUpdate): Promise<void> {
  // Get or create UserTaste record
  const taste = await prisma.userTaste.upsert({
    where: { userId: update.userId },
    create: {
      userId: update.userId,
      areas: [],
      rooms: {},
      types: {},
    },
    update: {},
  });
  
  const eventWeight = EVENT_WEIGHTS[update.eventKind] ?? 1.0;
  const decayFactor = getDecayFactor(update.eventTs);
  const finalWeight = eventWeight * decayFactor;
  
  // Update area preferences
  if (update.meta.areaSlug) {
    const areas = (taste.areas as any[]) ?? [];
    const existing = areas.find((a) => a.slug === update.meta.areaSlug);
    
    if (existing) {
      existing.score += finalWeight;
      existing.ts = update.eventTs.toISOString();
    } else {
      areas.push({
        slug: update.meta.areaSlug,
        score: finalWeight,
        ts: update.eventTs.toISOString(),
      });
    }
    
    // Keep top 20 areas, sort by score
    areas.sort((a, b) => b.score - a.score);
    const topAreas = areas.slice(0, 20);
    
    await prisma.userTaste.update({
      where: { userId: update.userId },
      data: { areas: topAreas },
    });
  }
  
  // Update price band
  if (update.meta.priceEur) {
    const currentMin = taste.minPrice ?? Infinity;
    const currentMax = taste.maxPrice ?? 0;
    
    await prisma.userTaste.update({
      where: { userId: update.userId },
      data: {
        minPrice: Math.min(currentMin, update.meta.priceEur),
        maxPrice: Math.max(currentMax, update.meta.priceEur),
      },
    });
  }
  
  // Update room preferences
  if (update.meta.rooms) {
    const rooms = (taste.rooms as Record<number, number>) ?? {};
    rooms[update.meta.rooms] = (rooms[update.meta.rooms] ?? 0) + finalWeight;
    
    await prisma.userTaste.update({
      where: { userId: update.userId },
      data: { rooms },
    });
  }
}

/**
 * Decay all user tastes (run weekly in cron)
 */
export async function decayAllTastes(): Promise<void> {
  const allTastes = await prisma.userTaste.findMany();
  
  for (const taste of allTastes) {
    // Decay area scores
    if (taste.areas) {
      const areas = (taste.areas as any[]).map((a) => ({
        ...a,
        score: a.score * getDecayFactor(new Date(a.ts)),
      }));
      
      // Remove areas with score < 0.1
      const filteredAreas = areas.filter((a) => a.score >= 0.1);
      
      await prisma.userTaste.update({
        where: { id: taste.id },
        data: { areas: filteredAreas },
      });
    }
    
    // Decay room preferences
    if (taste.rooms) {
      const rooms = taste.rooms as Record<number, number>;
      const decayedRooms: Record<number, number> = {};
      
      for (const [roomCount, score] of Object.entries(rooms)) {
        const decayed = score * 0.95; // Weekly 5% decay
        if (decayed >= 0.1) {
          decayedRooms[Number(roomCount)] = decayed;
        }
      }
      
      await prisma.userTaste.update({
        where: { id: taste.id },
        data: { rooms: decayedRooms },
      });
    }
  }
}
```

---

#### **Ranking Engine** (src/lib/reco/rank.ts):

```typescript
/**
 * Day 35: Personalized Ranking Engine
 * Scores and ranks property groups based on user taste
 */

type CandidateGroup = {
  id: string;
  areaSlug: string | null;
  priceEur: number | null;
  areaM2: number | null;
  rooms: number | null;
  priceBadge: string | null;
  ttsBucket: string | null;
  yieldNet: number | null;
  distMetroM: number | null;
  createdAt: Date;
};

type ScoredCandidate = CandidateGroup & {
  score: number;
  scoreBreakdown: {
    areaMatch: number;
    priceInBand: number;
    underpriced: number;
    fastTTS: number;
    highYield: number;
    metroProximity: number;
    roomMatch: number;
  };
};

/**
 * Scoring weights
 */
const WEIGHTS = {
  areaMatch: 3.0,        // Match to top-N areas
  priceInBand: 2.0,      // Within user's price band
  underpriced: 2.5,      // Underpriced badge
  fastTTS: 1.5,          // Fast TTS bucket
  highYield: 1.0,        // High net yield
  metroProximity: 0.5,   // Close to metro
  roomMatch: 1.5,        // Match room preferences
};

/**
 * Fetch candidate groups (last 7 days)
 */
async function getCandidates(): Promise<CandidateGroup[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const groups = await prisma.dedupGroup.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      analyses: {
        where: { status: "done" },
        include: {
          featureSnapshot: true,
          scoreSnapshot: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 200, // Limit candidate pool
  });
  
  return groups.map((g) => {
    const analysis = g.analyses[0];
    const features = analysis?.featureSnapshot?.features as any;
    const score = analysis?.scoreSnapshot as any;
    
    return {
      id: g.id,
      areaSlug: features?.areaSlug ?? null,
      priceEur: features?.priceEur ?? null,
      areaM2: features?.areaM2 ?? null,
      rooms: features?.rooms ?? null,
      priceBadge: score?.priceBadge ?? null,
      ttsBucket: score?.ttsBucket ?? null,
      yieldNet: score?.yieldNet ?? null,
      distMetroM: features?.distMetroM ?? null,
      createdAt: g.createdAt,
    };
  });
}

/**
 * Score a single candidate against user taste
 */
function scoreCandidate(
  candidate: CandidateGroup,
  taste: UserTaste
): ScoredCandidate {
  const breakdown = {
    areaMatch: 0,
    priceInBand: 0,
    underpriced: 0,
    fastTTS: 0,
    highYield: 0,
    metroProximity: 0,
    roomMatch: 0,
  };
  
  // 1. Area match (top-N areas)
  if (candidate.areaSlug && taste.areas) {
    const areas = taste.areas as any[];
    const match = areas.find((a) => a.slug === candidate.areaSlug);
    if (match) {
      // Normalize score to 0-1
      const maxScore = areas[0]?.score ?? 1;
      breakdown.areaMatch = (match.score / maxScore) * WEIGHTS.areaMatch;
    }
  }
  
  // 2. Price in band
  if (candidate.priceEur && taste.minPrice && taste.maxPrice) {
    const mid = (taste.minPrice + taste.maxPrice) / 2;
    const range = taste.maxPrice - taste.minPrice;
    const distance = Math.abs(candidate.priceEur - mid);
    
    if (distance <= range / 2) {
      breakdown.priceInBand = WEIGHTS.priceInBand;
    } else if (distance <= range) {
      breakdown.priceInBand = WEIGHTS.priceInBand * 0.5;
    }
  }
  
  // 3. Underpriced badge
  if (candidate.priceBadge === "underpriced") {
    breakdown.underpriced = WEIGHTS.underpriced;
  }
  
  // 4. Fast TTS
  if (candidate.ttsBucket === "fast") {
    breakdown.fastTTS = WEIGHTS.fastTTS;
  }
  
  // 5. High yield
  if (candidate.yieldNet && candidate.yieldNet >= 0.06) {
    breakdown.highYield = WEIGHTS.highYield;
  }
  
  // 6. Metro proximity
  if (candidate.distMetroM !== null) {
    if (candidate.distMetroM <= 500) {
      breakdown.metroProximity = WEIGHTS.metroProximity;
    } else if (candidate.distMetroM <= 1000) {
      breakdown.metroProximity = WEIGHTS.metroProximity * 0.5;
    }
  }
  
  // 7. Room match
  if (candidate.rooms && taste.rooms) {
    const rooms = taste.rooms as Record<number, number>;
    const match = rooms[candidate.rooms];
    if (match) {
      // Normalize to 0-1
      const maxScore = Math.max(...Object.values(rooms));
      breakdown.roomMatch = (match / maxScore) * WEIGHTS.roomMatch;
    }
  }
  
  const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  
  return {
    ...candidate,
    score: totalScore,
    scoreBreakdown: breakdown,
  };
}

/**
 * Get personalized recommendations for user
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit = 10
): Promise<ScoredCandidate[]> {
  // Get user taste
  const taste = await prisma.userTaste.findUnique({
    where: { userId },
  });
  
  if (!taste) {
    // No taste yet - return generic recommendations
    return getGenericRecommendations(limit);
  }
  
  // Get candidate groups
  const candidates = await getCandidates();
  
  // Score each candidate
  const scored = candidates.map((c) => scoreCandidate(c, taste));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Return top N
  return scored.slice(0, limit);
}

/**
 * Fallback for users without taste profile
 */
async function getGenericRecommendations(
  limit: number
): Promise<ScoredCandidate[]> {
  const candidates = await getCandidates();
  
  // Simple scoring: underpriced + fast TTS
  const scored = candidates.map((c) => ({
    ...c,
    score:
      (c.priceBadge === "underpriced" ? 2 : 0) +
      (c.ttsBucket === "fast" ? 1 : 0),
    scoreBreakdown: {
      areaMatch: 0,
      priceInBand: 0,
      underpriced: c.priceBadge === "underpriced" ? 2 : 0,
      fastTTS: c.ttsBucket === "fast" ? 1 : 0,
      highYield: 0,
      metroProximity: 0,
      roomMatch: 0,
    },
  }));
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
```

---

### 4. Event Tracking Enhancements

#### **Current Tracking Points:**

1. **AreaEvent Tracking** (via `/api/track`):
   - Report page views (ReportTracker.tsx)
   - Not user-specific
   - Used for area demand scoring

2. **BuyerEvent Tracking**:
   - Saved search runs
   - Compare page opens
   - Watch price drops (automatic)
   - Mortgage calculator usage

#### **New Tracking Points Needed:**

**1. Report Page View Tracking:**
```tsx
// src/app/report/[id]/page.tsx
// After analysis load, log BuyerEvent

if (session?.user?.id && analysis?.groupId) {
  await prisma.buyerEvent.create({
    data: {
      userId: session.user.id,
      kind: "view_property",
      meta: {
        groupId: analysis.groupId,
        analysisId: analysis.id,
        areaSlug: features?.areaSlug,
        priceEur: features?.priceEur,
        rooms: features?.rooms,
        city: features?.city,
      },
      ts: new Date(),
    },
  });
  
  // Update user taste
  await updateUserTaste({
    userId: session.user.id,
    eventKind: "view_property",
    eventTs: new Date(),
    meta: {
      groupId: analysis.groupId,
      areaSlug: features?.areaSlug,
      priceEur: features?.priceEur,
      rooms: features?.rooms,
    },
  });
}
```

**2. Dwell Time Tracking (Client-side):**
```tsx
// src/components/DwellTracker.tsx
"use client";

export default function DwellTracker({ groupId, analysisId, meta }) {
  useEffect(() => {
    const startTime = Date.now();
    
    const handleBeforeUnload = () => {
      const dwellSeconds = (Date.now() - startTime) / 1000;
      
      if (dwellSeconds >= 15) {
        // Send beacon (non-blocking)
        navigator.sendBeacon(
          "/api/track/dwell",
          JSON.stringify({
            groupId,
            analysisId,
            dwellSeconds,
            meta,
          })
        );
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [groupId, analysisId]);
  
  return null;
}
```

**3. Watch Item Addition:**
```tsx
// src/app/me/buyer/watch.actions.ts
// Update addToWatchAction

export async function addToWatchAction(groupId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  
  const item = await prisma.watchItem.create({
    data: { userId: session.user.id, groupId },
    include: {
      group: {
        include: {
          analyses: {
            where: { status: "done" },
            include: { featureSnapshot: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  
  // Log BuyerEvent
  const features = item.group.analyses[0]?.featureSnapshot?.features as any;
  await prisma.buyerEvent.create({
    data: {
      userId: session.user.id,
      kind: "add_to_watch",
      meta: {
        groupId,
        areaSlug: features?.areaSlug,
        priceEur: features?.priceEur,
        rooms: features?.rooms,
      },
    },
  });
  
  // Update taste with high weight
  await updateUserTaste({
    userId: session.user.id,
    eventKind: "add_to_watch",
    eventTs: new Date(),
    meta: {
      groupId,
      areaSlug: features?.areaSlug,
      priceEur: features?.priceEur,
      rooms: features?.rooms,
    },
  });
  
  revalidatePath("/me/buyer");
}
```

**4. Discover Card Click:**
```tsx
// src/app/discover/page.tsx or card component
// Add click tracking

async function handleCardClick(groupId: string) {
  // Log to BuyerEvent
  await fetch("/api/track/discover", {
    method: "POST",
    body: JSON.stringify({ groupId }),
  });
}
```

---

### 5. Updated /me/buyer Section

**Replace Current Recommendations Section:**

```tsx
// src/app/me/buyer/page.tsx

import { getPersonalizedRecommendations } from "@/lib/reco/rank";

export default async function BuyerPortalPage() {
  const session = await auth();
  if (!session?.user?.id) return <SignInRequired />;
  
  // ... existing code ...
  
  // Get personalized recommendations
  const recommendations = await getPersonalizedRecommendations(
    session.user.id,
    10
  );
  
  return (
    <div className="container py-8 space-y-8">
      {/* ... existing sections ... */}
      
      {/* Personalized Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recomandate pentru tine</CardTitle>
          <p className="text-sm text-muted-foreground">
            Based on your browsing history and preferences
          </p>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Start browsing properties to get personalized recommendations!</p>
              <Link href="/discover">
                <Button className="mt-4">Explore Properties</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  groupId={rec.id}
                  score={rec.score}
                  scoreBreakdown={rec.scoreBreakdown}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Debug: Show Taste Profile (dev only) */}
      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardHeader>
            <CardTitle>Your Taste Profile (Debug)</CardTitle>
          </CardHeader>
          <CardContent>
            <TasteProfileDebug userId={session.user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Summary Comparison Table

| Aspect | Current | Planned (Day 35) | Improvement |
|--------|---------|------------------|-------------|
| **User Preference Storage** | None | UserTaste table | New capability |
| **Tracking Events** | 4 types (saved search, compare, watch drop, mortgage) | 9 types (+view, dwell, add watch, discover click, filters) | 125% more events |
| **Event Context** | Minimal (kind + basic meta) | Rich (groupId, areaSlug, price, rooms, dwell time) | 5× more context |
| **Area Preferences** | None | Top-20 areas with scores + decay | New |
| **Price Band** | None | Min/max price from behavior | New |
| **Room Preferences** | None | Weighted room count preferences | New |
| **Decay Logic** | None | 7-day half-life | New |
| **Recommendation Scoring** | Binary (underpriced OR fast TTS) | Weighted 7-factor score | Much smarter |
| **Scoring Factors** | 2 (price badge, TTS) | 7 (area, price band, badge, TTS, yield, metro, rooms) | 3.5× more factors |
| **Personalization** | None (same for all users) | Fully personalized per user | ∞× better |
| **Candidate Pool** | All analyses | Last 7 days groups | Fresher |
| **Ranking** | Simple filter → newest first | Weighted score → highest first | Intelligent |
| **Dwell Time** | Not tracked | Tracked (3× weight for >15s) | New signal |
| **Watch Impact** | Not tracked for taste | 5× weight in taste | Strong signal |
| **Fallback** | Basic filter | Generic recommendations | Better UX |
| **Score Transparency** | None | scoreBreakdown shown | Debuggable |

---

## Implementation Checklist

### Phase 1: Schema & Infrastructure
- [ ] Add UserTaste table to schema.prisma
- [ ] Create migration for UserTaste
- [ ] Update BuyerEvent.kind type (add new event types)
- [ ] Enhance BuyerEvent.meta structure

### Phase 2: Taste Tracking
- [ ] Create `src/lib/reco/taste.ts`
- [ ] Implement `updateUserTaste()` function
- [ ] Implement `decayAllTastes()` function
- [ ] Add decay weights (EVENT_WEIGHTS)
- [ ] Add 7-day half-life calculation

### Phase 3: Ranking Engine
- [ ] Create `src/lib/reco/rank.ts`
- [ ] Implement `getCandidates()` (last 7 days groups)
- [ ] Implement `scoreCandidate()` with 7 factors
- [ ] Implement `getPersonalizedRecommendations()`
- [ ] Implement `getGenericRecommendations()` fallback

### Phase 4: Event Tracking Integration
- [ ] Update Report page to log "view_property"
- [ ] Create DwellTracker component for >15s tracking
- [ ] Create `/api/track/dwell` endpoint
- [ ] Update `addToWatchAction` to log event + update taste
- [ ] Add discover card click tracking
- [ ] Create `/api/track/discover` endpoint

### Phase 5: UI Integration
- [ ] Update `/me/buyer` recommendations section
- [ ] Replace basic filter with `getPersonalizedRecommendations()`
- [ ] Add "Recomandate pentru tine" title
- [ ] Show personalized cards with score breakdown (optional)
- [ ] Add "Start browsing" CTA for new users
- [ ] Create TasteProfileDebug component (dev mode)

### Phase 6: Decay Automation
- [ ] Create `/api/cron/taste/decay` endpoint
- [ ] Schedule weekly decay job (Sundays 4 AM UTC)
- [ ] Add logging and error handling

### Phase 7: QA & Testing
- [ ] Create test user account
- [ ] View 3-4 properties in Sector 1, 2-room, 80k-120k EUR
- [ ] Dwell >15s on 1-2 properties
- [ ] Add 1 property to watchlist
- [ ] Check `/me/buyer` recommendations
- [ ] Verify recommendations match preferences (Sector 1, 2-room, ~100k)
- [ ] View different area (Sector 3, 3-room, 150k+)
- [ ] Verify recommendations shift
- [ ] Check taste profile updates (dev debug view)
- [ ] Verify decay logic (mock time or wait 7 days)

---

## Key Differences from Spec

### ✅ Aligned:
- UserTaste table with areas, price band, room prefs
- 7-day half-life decay
- Weighted scoring (match areas, price, underpriced, fast TTS, yield, metro)
- Last 7 days candidate groups
- Hook events: view report, dwell >15s, add to watch
- /me/buyer section "Recomandate pentru tine"
- QA plan: test user, view zones, verify shift

### ⚠️ Enhancements Over Spec:
- Added property type preferences (apartment vs house)
- Added room preference tracking (not just binary)
- Added discover card click event
- Added search filters event for deliberate preference signal
- Added scoreBreakdown for transparency/debugging
- Added generic recommendations fallback
- Added TasteProfileDebug component for dev testing
- Added weekly decay cron (spec didn't mention automation)

### 🔄 Implementation Notes:
- BuyerEvent already exists - just need to add new event types
- DedupGroup infrastructure ready (Day 19, Day 29)
- /me/buyer page exists - just need to swap recommendation logic
- Watch actions exist - just need to add event logging
- No email/push notifications (spec: "zero notifications")

---

## File Creation Summary

**New Files (9):**
1. `src/lib/reco/taste.ts` (~200 lines) - Taste update & decay logic
2. `src/lib/reco/rank.ts` (~250 lines) - Scoring & ranking engine
3. `src/components/DwellTracker.tsx` (~40 lines) - Client-side dwell tracking
4. `src/components/RecommendationCard.tsx` (~80 lines) - Enhanced card with score
5. `src/components/TasteProfileDebug.tsx` (~60 lines) - Dev debug view
6. `src/app/api/track/dwell/route.ts` (~40 lines) - Dwell event endpoint
7. `src/app/api/track/discover/route.ts` (~40 lines) - Discover click endpoint
8. `src/app/api/cron/taste/decay/route.ts` (~30 lines) - Weekly decay cron
9. `prisma/migrations/YYYYMMDD_add_user_taste/migration.sql` (auto-generated)

**Modified Files (4):**
1. `prisma/schema.prisma` - Add UserTaste model
2. `src/app/me/buyer/page.tsx` - Use personalized recommendations
3. `src/app/report/[id]/page.tsx` - Add view_property tracking
4. `src/app/me/buyer/watch.actions.ts` - Add event logging

**Total LOC:** ~740 new lines + 50 modified lines

---

## Expected Impact

**Performance:**
- First-time users: Generic recommendations (underpriced + fast TTS)
- After 3-5 property views: Start showing area/price preferences
- After 10+ interactions: Fully personalized recommendations
- Decay ensures fresh preferences (7-day half-life)

**User Experience:**
- Relevant recommendations based on actual behavior
- No annoying notifications (zero emails/push)
- Seamless in-app discovery
- "Recomandate pentru tine" feels personal

**Business Value:**
- Higher engagement (relevant recommendations)
- Better conversion (properties match taste)
- Implicit feedback loop (views → better recs → more views)
- Data-driven insights into user preferences

---

## Next Steps After Comparison

1. **Review comparison with user** - Confirm approach aligns with Day 35 goals
2. **Add UserTaste table** - Update schema.prisma
3. **Implement taste.ts** - Preference tracking logic
4. **Implement rank.ts** - Scoring engine
5. **Add event tracking** - Report page, dwell time, watch actions
6. **Update /me/buyer** - Use personalized recommendations
7. **QA testing** - Create test user, verify preference shift

**Ready to proceed with implementation?**
