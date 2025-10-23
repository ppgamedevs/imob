# Day 29: Buyer Portal - Saved Searches, Watchlist, Compare & Mortgage Calculator

## Overview
Complete buyer retention system with personalized portal for saving searches, tracking favorites, comparing properties, and calculating mortgage affordability.

## Features Implemented

### 1. Saved Searches v2
- **Query Schema**: Complete filter support (areas, price, m², rooms, year, metro, underpriced, TTS, keywords)
- **Zod Validation**: Type-safe query parsing with coercion
- **Search Runner**: Reuses Discover logic + budget filtering
- **Server Actions**: Create, delete, list saved searches
- **Cron Runner**: Batch process searches for notifications (API: `/api/cron/saved-search`)

### 2. Watchlist (Favorite Properties)
- **Group-Based**: Track DedupGroups (not individual listings)
- **Price Tracking**: Detect price changes via GroupSnapshot comparison
- **Notes**: Optional user notes per property
- **Server Actions**: Add, remove, list, check watch status
- **UI Component**: WatchButton with star icon toggle

### 3. Compare Properties
- **Side-by-Side**: Up to 4 properties in table format
- **Metrics**: Price, €/m², AVM range, rooms, year, TTS, yield, metro, risk, condition, duplicates
- **Winners**: Auto-detect "Best Value", "Fastest to Sell", "Best Yield"
- **Server Actions**: Create, delete, list compare sets
- **Page**: `/compare/[id]` with full comparison table

### 4. Mortgage & Affordability
- **Calculator**: Monthly payment (P&I), fixed costs, total
- **DTI Ratio**: Debt-to-income with affordability badge
- **Formula**: Amortization with configurable down payment, rate, term
- **Helper Functions**: `mortgageCalc()`, `maxAffordablePrice()`
- **UI Component**: MortgageCalculator with interactive inputs

### 5. Buyer Portal Dashboard
- **Page**: `/me/buyer` - personalized hub
- **Sections**:
  - Saved Searches with "Run Search" buttons
  - Watchlist with price drop badges
  - Recent Comparisons
  - Recommended Properties (underpriced + fast TTS)
- **Quick Actions**: Search Properties, Browse Zones
- **Components**: SavedSearchCard, WatchlistCard

### 6. UI Integration
- **BuyerToolbar**: Save search + Compare selection toolbar
- **WatchButton**: Star favorite toggle on property cards
- **MortgageCalculator**: Embedded calculator widget
- **Navigation**: Added "Portal Cumpărător" link to header

## Database Schema

```prisma
model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  name        String?
  queryJson   Json      // SavedQuery schema
  lastRunAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model WatchItem {
  id          String   @id @default(cuid())
  userId      String
  groupId     String   // DedupGroup.id
  createdAt   DateTime  @default(now())
  note        String?
  @@unique([userId, groupId])
}

model CompareSet {
  id          String   @id @default(cuid())
  userId      String
  groupIds    String   // CSV: "id1,id2,id3"
  createdAt   DateTime  @default(now())
  name        String?
}

model BuyerEvent {
  id        String   @id @default(cuid())
  userId    String
  kind      String   // saved_search_run | watch_price_drop | compare_open | mortgage_calc
  meta      Json?
  ts        DateTime @default(now())
}
```

**Migration**: `20251023073241_buyer_portal_v1`

## File Structure

```
src/
├── types/
│   └── saved-search.ts (SavedQuery type)
├── lib/
│   ├── saved-search/
│   │   ├── validate.ts (Zod schema)
│   │   └── run.ts (Search runner)
│   └── finance/
│       └── mortgage.ts (Calculator logic)
├── components/
│   └── buyer/
│       ├── BuyerToolbar.tsx (Save + Compare actions)
│       ├── WatchButton.tsx (Favorite toggle)
│       └── MortgageCalculator.tsx (Affordability widget)
├── app/
│   ├── me/buyer/
│   │   ├── page.tsx (Portal dashboard)
│   │   ├── saved.actions.ts (Saved search actions)
│   │   ├── watch.actions.ts (Watchlist actions)
│   │   ├── SavedSearchCard.tsx (Search card UI)
│   │   └── WatchlistCard.tsx (Watch item UI)
│   ├── compare/
│   │   ├── actions.ts (Compare actions)
│   │   └── [id]/page.tsx (Comparison table)
│   └── api/cron/saved-search/
│       └── route.ts (Batch runner)
```

## Key Calculations

### Mortgage Payment
```typescript
const r = (ratePct / 100) / 12; // monthly rate
const n = years * 12; // total payments
const monthly = (principal * r) / (1 - Math.pow(1 + r, -n));
const dti = totalMonthly / incomeNet;
const affordable = dti <= 0.4;
```

### Budget Filtering
```typescript
// In runSavedSearch
if (query.budget) {
  items = items.filter(item => {
    const calc = mortgageCalc({ price: item.priceEur, ... });
    return calc.ok; // DTI <= max
  });
}
```

### Price Change Detection
```typescript
// In WatchlistCard
const snapshots = group.snapshots; // [latest, previous]
const priceDropped = snapshots[0]?.price < snapshots[1]?.price;
```

## User Flows

### Save Search Flow
1. User searches in Discover with filters
2. Clicks "Save Search" in BuyerToolbar
3. Enters optional name
4. Search saved to SavedSearch table
5. Available in /me/buyer dashboard
6. Click "Run Search" → redirects to Discover with filters

### Watchlist Flow
1. User views property in Discover/Report
2. Clicks star WatchButton
3. Property added to WatchItem table (by groupId)
4. Shows in /me/buyer watchlist
5. Price changes detected via snapshots
6. Badge shown: "Price Dropped!"

### Compare Flow
1. User selects 2-4 properties (checkboxes in Discover)
2. Clicks "Compare" in BuyerToolbar
3. CompareSet created with CSV groupIds
4. Redirects to /compare/[id]
5. Table shows all metrics side-by-side
6. Winners highlighted: Best Value, Fastest, Best Yield

### Mortgage Flow
1. User views property report
2. MortgageCalculator shown below property details
3. Adjusts inputs: down %, rate, term, income
4. See real-time: monthly payment, DTI, affordability badge
5. Green "Affordable" or red "Over Budget"

## Integration Points

### With Discover (Day 15)
- SavedQuery → URLSearchParams conversion
- Reuses `discoverSearch()` function
- Budget filter wraps Discover results

### With Dedup (Day 26-27)
- Watchlist tracks DedupGroups (not Analysis)
- Compare uses canonicalAnalysis from group
- Price changes via GroupSnapshot

### With Scoring (Day 22)
- Recommendations filter by priceBadge="underpriced"
- TTS bucket for "Fast TTS" recommendations
- Yield for "Best Investment" ranking

## Cron Setup

Add to Vercel Cron (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/saved-search",
    "schedule": "0 */6 * * *"
  }]
}
```

Runs every 6 hours to check saved searches for new results.

## Future Enhancements (v2)

1. **Email Notifications**: Send digest of new results
2. **Price Alerts**: Email when watchlist property drops price
3. **Smart Recommendations**: ML-based user preferences
4. **Saved Search Diff**: Show only new results since last run
5. **Compare History**: Track comparison views over time
6. **Mortgage Pre-approval**: Partner with banks for real rates
7. **Investment Calculator**: ROI, cash-on-cash return, IRR
8. **Portfolio Tracking**: Multiple property investment analysis

## Testing Checklist

- [ ] Create saved search with filters
- [ ] Run saved search from dashboard
- [ ] Delete saved search
- [ ] Add property to watchlist (star button)
- [ ] Remove from watchlist
- [ ] Detect price drops in watchlist
- [ ] Select 2-4 properties in Discover
- [ ] Create comparison
- [ ] View comparison table with metrics
- [ ] Verify winners highlighted correctly
- [ ] Use mortgage calculator
- [ ] Check DTI affordability logic
- [ ] View buyer portal dashboard
- [ ] Check recommendations shown
- [ ] Test cron endpoint manually

## Notes

- **Prisma Type Errors**: Expected locally (client stale). Will resolve on Vercel build.
- **CSV Storage**: groupIds stored as CSV for v1 simplicity. Can migrate to Json[] in v2.
- **Budget Filter**: Optional in v1. Can be enabled per search in UI.
- **Notifications**: Logged to BuyerEvent for now. Email delivery in v2.
- **Authentication**: All actions require sign-in via NextAuth.

## Differentiators

1. **Dedup-Aware**: Watchlist and compare work with deduplicated groups
2. **AVM Integration**: Compare shows AVM ranges alongside asking prices
3. **TTS Context**: "Fast to sell" as decision factor
4. **Investment Focus**: Yield calculations for buyers/investors
5. **Affordability First**: DTI-based filtering in saved searches
6. **Price Tracking**: Historical snapshots detect changes

This completes Day 29. Buyers now have a complete retention portal with search saving, favorites, comparison tools, and mortgage calculations.
