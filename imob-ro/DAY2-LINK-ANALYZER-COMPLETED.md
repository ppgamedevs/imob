# Day 2 - Link Analyzer Schema & Migration

## ✅ Completed

### Schema Models Added

All Link Analyzer models have been added to `prisma/schema.prisma`:

**1. Analysis**
- Core analysis tracking table
- Fields: `id`, `userId?`, `sourceUrl`, `canonicalUrl?`, `status`, `createdAt`, `updatedAt`
- Indexes: `sourceUrl`, `userId`
- Relation: Optional link to User

**2. ExtractedListing**
- Stores extracted property data from analyzed URLs
- Fields: `analysisId`, `title?`, `price?`, `currency?`, `areaM2?`, `rooms?`, `floor?`, `yearBuilt?`, `addressRaw?`, `lat?`, `lng?`, `photos` (Json)
- Indexes: `(lat, lng)` for geospatial queries
- One-to-one relation with Analysis

**3. FeatureSnapshot**
- Normalized feature data snapshot
- Fields: `analysisId`, `features` (Json)
- One-to-one relation with Analysis

**4. ScoreSnapshot**
- Property valuation and scoring data
- Fields: `analysisId`, `avmLow`, `avmHigh`, `avmConf`, `ttsBucket`, `yieldGross?`, `yieldNet?`, `riskSeismic?`, `conditionScore?`
- One-to-one relation with Analysis

**5. PriceHistory**
- Historical price tracking for monitored properties
- Fields: `sourceUrl`, `ts`, `price`, `currency`
- Indexes: `sourceUrl`, `(sourceUrl, ts)` for efficient time-series queries

**6. AreaDaily**
- Daily market statistics per area
- Fields: `areaSlug`, `date`, `medianEurM2`, `supply`, `demandScore`
- Unique constraint: `(areaSlug, date)` to prevent duplicates
- Indexes: `areaSlug`, `date`

### Migration Created

Migration file: `prisma/migrations/20251016000000_link_analyzer/migration.sql`

The migration includes:
- All 6 new tables with proper column types
- All required indexes for performance
- Foreign key constraints with appropriate cascade rules
- Unique constraints where needed

### Key Indexes Implemented

✅ **sourceUrl indexes**:
- `Analysis.sourceUrl` - for quick lookups of analyses by URL
- `PriceHistory.sourceUrl` - for historical price queries
- `PriceHistory.(sourceUrl, ts)` - composite index for time-series queries

✅ **Geospatial indexes**:
- `ExtractedListing.(lat, lng)` - for location-based queries and proximity searches

### Relations Configured

- `User` ↔ `Analysis` (optional, one-to-many)
- `Analysis` ↔ `ExtractedListing` (one-to-one)
- `Analysis` ↔ `FeatureSnapshot` (one-to-one)
- `Analysis` ↔ `ScoreSnapshot` (one-to-one)

All child relations use `onDelete: Cascade` to ensure data consistency.

## 📋 How to Apply the Migration

When ready to apply this migration to your database:

```bash
cd imob-ro

# Make sure DATABASE_URL is set in .env.local
# Then run:
npx prisma migrate deploy

# Or for development:
npx prisma migrate dev

# Generate Prisma Client with new models:
npx prisma generate
```

## 🎯 Next Steps

With the schema in place, you can now:

1. **Generate Prisma Client** to access the new models in your TypeScript code
2. **Build Link Analysis API** - Create endpoints to:
   - Submit URLs for analysis
   - Retrieve analysis results
   - Track price history
3. **Implement Scraper Service** - Extract listing data from property websites
4. **Build AVM (Automated Valuation Model)** - Score and value properties
5. **Area Analytics Dashboard** - Visualize `AreaDaily` data

## 📊 Schema Summary

- **6 new models** added for Link Analyzer functionality
- **11 indexes** created for optimal query performance
- **4 foreign key relationships** with proper cascade behavior
- **2 unique constraints** to prevent duplicate data
- **3 Json fields** for flexible data storage (photos, features)
- **Geospatial support** via lat/lng indexing

## ✨ Features Enabled

This schema enables:
- 🔗 **URL Analysis**: Track analysis of property listing URLs
- 📊 **Property Extraction**: Store structured data from listings
- 💰 **Price Tracking**: Historical price monitoring
- 🏘️ **Area Analytics**: Daily market statistics per neighborhood
- 📈 **Valuation Scoring**: AVM confidence ranges and metrics
- 🗺️ **Geospatial Queries**: Location-based property searches

All ready for Day 3 development! 🚀
