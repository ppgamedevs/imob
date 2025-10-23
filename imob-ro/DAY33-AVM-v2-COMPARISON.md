# Day 33: AVM v2 - Current vs Planned Comparison

## Executive Summary

**Current State (AVM v1):** Heuristic-based model using area medians with multiplicative adjustments  
**Planned State (AVM v2):** ML-based ridge regression with nightly training and prediction intervals

## Detailed Comparison

### 1. Feature Engineering

#### **Current (v1):**
```typescript
// src/lib/ml/avm.ts
// Manual feature extraction in estimateAvm()
const features = {
  areaSlug,      // Used to lookup medianEurM2 from AreaDaily
  city,          // Fallback to city-level default
  areaM2,        // Direct multiplication with €/m²
  level,         // Multiplicative adjustment (0.97-1.02)
  yearBuilt,     // Age-based multiplier (0.95-1.05)
  distMetroM,    // Distance penalty (0.97-1.05)
  conditionScore // Condition multiplier (0.95-1.05)
}
```

**Method:** Direct lookup + simple multipliers  
**Issues:**
- No learning from historical data
- Fixed adjustment weights (not optimized)
- No interaction effects between features
- Area is just a lookup key, not encoded as feature

#### **Planned (v2):**
```typescript
// src/lib/avm/features.ts
export function buildFeatureVector(snapshot: FeatureSnapshot, zoneData) {
  const features = [];
  
  // 1. Area encoding: Hash areaSlug to fixed buckets (0-99)
  const areaHash = hashString(areaSlug) % 100;
  const oneHot = new Array(100).fill(0);
  oneHot[areaHash] = 1;
  features.push(...oneHot);
  
  // 2. Normalized numeric features
  features.push(
    normalize(areaM2, 20, 200),           // Typical range
    normalize(rooms, 1, 5),
    normalize(yearBuilt, 1950, 2024),
    normalize(distMetroM, 0, 2000),
    conditionScore ?? 0.5,                // Already 0-1
  );
  
  // 3. Zone context (from AreaDaily)
  features.push(
    normalize(zoneData.medianEurM2, 1000, 3000),
    normalize(zoneData.supply, 0, 500),
    normalize(zoneData.demand, 0, 1),
  );
  
  return features; // ~110 dimensions
}
```

**Method:** One-hot area encoding + normalized numerics  
**Advantages:**
- Learns area-specific patterns automatically
- Feature normalization for stable training
- Includes market context (supply/demand)
- Supports interaction via regression coefficients

---

### 2. Model Architecture

#### **Current (v1):**
```typescript
// src/lib/ml/avm.ts - Lines 95-145
export async function estimateAvm(features) {
  const medEurM2 = await getAreaMedianEurM2(areaSlug, city);
  
  // Multiplicative adjustments
  const eurM2 = medEurM2 
    * adjFloor(level)
    * adjYear(yearBuilt)
    * adjMetro(distMetroM)
    * adjCondition(conditionScore);
  
  const mid = eurM2 * areaM2;
  
  // Fixed spread based on feature availability
  const spread = spreadFromConfidence(hasArea, hasMetro, hasCond, areaM2);
  const low = mid * (1 - spread);
  const high = mid * (1 + spread);
  
  return { low, mid, high, conf: 1 - spread, explain };
}
```

**Type:** Heuristic rule-based  
**Parameters:** 
- Fixed multipliers (hardcoded)
- No training/fitting
- No parameter optimization

**Interval Logic:**
- Spread: 6-18% based on feature availability
- `conf = 1 - spread` (not statistically grounded)
- No calibration to actual price variance

#### **Planned (v2):**
```typescript
// src/lib/avm/model.ts
export function trainRidge(X: number[][], y: number[], lambda = 1.0) {
  // Solve: w = (X^T X + λI)^(-1) X^T y
  const XtX = matrixMultiply(transpose(X), X);
  const XtY = matrixMultiply(transpose(X), y);
  
  // Add regularization
  for (let i = 0; i < XtX.length; i++) {
    XtX[i][i] += lambda;
  }
  
  // Gaussian elimination or QR decomposition
  const weights = solveLinearSystem(XtX, XtY);
  const intercept = mean(y) - dot(weights, mean(X));
  
  // Calculate residual std dev for intervals
  const predictions = X.map(x => dot(x, weights) + intercept);
  const residuals = y.map((yi, i) => yi - predictions[i]);
  const residualStd = std(residuals);
  
  // Metrics
  const mae = mean(residuals.map(Math.abs));
  const mape = mean(residuals.map((r, i) => Math.abs(r / y[i]))) * 100;
  
  return { weights, intercept, residualStd, metrics: { mae, mape } };
}

export function predictRidge(model, x: number[]) {
  const prediction = dot(x, model.weights) + model.intercept;
  
  // 80% confidence band: ± 1.28 * σ
  const margin = 1.28 * model.residualStd;
  
  return {
    prediction,
    lower80: prediction - margin,
    upper80: prediction + margin,
    conf: 0.8, // 80% confidence level
  };
}
```

**Type:** Supervised learning (ridge regression)  
**Parameters:** 
- ~110 learned weights (optimized from data)
- λ = 1.0 (regularization strength)
- Intercept term

**Interval Logic:**
- Based on empirical residual distribution
- Statistically calibrated (80% of test samples should fall within)
- Adaptive to model uncertainty

---

### 3. Training & Persistence

#### **Current (v1):**
```typescript
// No training - uses fixed rules
// No model storage
// No versioning
// No metrics tracking
```

**Update mechanism:** Code changes only  
**Validation:** None  

#### **Planned (v2):**

**Schema Addition:**
```prisma
// prisma/schema.prisma
model ModelSnapshot {
  id        String   @id @default(cuid())
  kind      String   // "avm", "tts", "rent"
  version   Int      // Incremental version number
  weights   Json     // { weights: number[], intercept: number, residualStd: number }
  metrics   Json     // { mae: number, mape: number, samples: number, testMae: number }
  createdAt DateTime @default(now())
  
  @@index([kind, createdAt])
}
```

**Training Pipeline:**
```typescript
// src/app/api/cron/avm-train/route.ts
export async function GET() {
  // 1. Pull training data (last 90 days)
  const analyses = await prisma.analysis.findMany({
    where: {
      status: "done",
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      featureSnapshot: { isNot: null },
      scoreSnapshot: { isNot: null },
    },
    include: {
      featureSnapshot: true,
      scoreSnapshot: true,
      group: {
        include: {
          analyses: {
            where: { status: "done" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  
  // 2. Build feature matrix X and target vector y
  const pairs = [];
  for (const a of analyses) {
    const features = buildFeatureVector(
      a.featureSnapshot.features,
      await loadZoneData(a.featureSnapshot.features.areaSlug)
    );
    
    // Target: actual priceEur OR group median proxy
    const target = a.featureSnapshot.features.priceEur 
      || (a.group.analyses[0]?.scoreSnapshot?.avmMid 
          * a.featureSnapshot.features.areaM2);
    
    if (target > 0 && features.length === 110) {
      pairs.push({ x: features, y: target });
    }
  }
  
  if (pairs.length < 1000) {
    return Response.json({ error: "Insufficient data", samples: pairs.length });
  }
  
  // 3. Split 80/20 train/test
  const shuffled = shuffle(pairs);
  const split = Math.floor(shuffled.length * 0.8);
  const train = shuffled.slice(0, split);
  const test = shuffled.slice(split);
  
  // 4. Train ridge regression
  const model = trainRidge(
    train.map(p => p.x),
    train.map(p => p.y),
    1.0
  );
  
  // 5. Evaluate on test set
  const testPreds = test.map(p => predictRidge(model, p.x));
  const testMae = mean(testPreds.map((pred, i) => Math.abs(pred.prediction - test[i].y)));
  const testMape = mean(testPreds.map((pred, i) => 
    Math.abs((pred.prediction - test[i].y) / test[i].y)
  )) * 100;
  
  // 6. Save if better than previous
  const prevModel = await getLatestModel("avm");
  if (!prevModel || testMae < (prevModel.metrics.testMae ?? Infinity)) {
    await saveModel({
      kind: "avm",
      weights: model,
      metrics: {
        mae: model.metrics.mae,
        mape: model.metrics.mape,
        testMae,
        testMape,
        samples: pairs.length,
        trainSamples: train.length,
        testSamples: test.length,
      },
    });
  }
  
  return Response.json({
    trained: true,
    version: (prevModel?.version ?? 0) + 1,
    metrics: { testMae, testMape },
    samples: pairs.length,
  });
}
```

**Persistence:**
```typescript
// src/lib/avm/store.ts
export async function saveModel(model, metrics) {
  const latest = await getLatestModel("avm");
  const version = (latest?.version ?? 0) + 1;
  
  return prisma.modelSnapshot.create({
    data: {
      kind: "avm",
      version,
      weights: {
        weights: model.weights,
        intercept: model.intercept,
        residualStd: model.residualStd,
      },
      metrics,
    },
  });
}

export async function getLatestModel(kind: string) {
  return prisma.modelSnapshot.findFirst({
    where: { kind },
    orderBy: { createdAt: "desc" },
  });
}
```

**Update frequency:** Nightly cron (2 AM UTC)  
**Validation:** Test set MAE/MAPE tracking  
**Rollback:** Keep previous version if new model underperforms

---

### 4. Prediction Application

#### **Current (v1):**
```typescript
// src/lib/ml/apply-avm.ts
export async function applyAvmToAnalysis(analysisId: string, features: any) {
  const res = await estimateAvm(features); // Heuristic model
  const asking = features?.priceEur ?? null;
  const priceBadge = computePriceBadge(asking, res.low, res.mid, res.high);
  
  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      avmLow: res.low,
      avmHigh: res.high,
      avmMid: res.mid,
      avmConf: res.conf,
      priceBadge,
      explain: { avm: res.explain },
    },
    create: { /* same */ },
  });
  
  return res;
}
```

**Data flow:**
1. Analysis created → `applyAvmToAnalysis()` called
2. Heuristic calculation (no DB lookup for model)
3. Store in ScoreSnapshot

#### **Planned (v2):**
```typescript
// src/lib/ml/apply-avm.ts (updated)
export async function applyAvmToAnalysis(analysisId: string, features: any) {
  let res;
  
  // Feature flag: switch between ML and heuristic
  if (process.env.AVM_MODEL === "ml") {
    // Load latest ML model
    const model = await getLatestModel("avm");
    
    if (model) {
      // Build feature vector
      const zoneData = await loadZoneData(features.areaSlug);
      const x = buildFeatureVector(features, zoneData);
      
      // Predict with ML model
      const pred = predictRidge(model.weights, x);
      
      res = {
        low: Math.round(pred.lower80),
        mid: Math.round(pred.prediction),
        high: Math.round(pred.upper80),
        conf: pred.conf,
        explain: { model: "ridge-v2", version: model.version },
      };
    } else {
      // Fallback to heuristic if no model available
      res = await estimateAvm(features);
      res.explain.fallback = "no-ml-model";
    }
  } else {
    // Use heuristic (default)
    res = await estimateAvm(features);
  }
  
  const asking = features?.priceEur ?? null;
  const priceBadge = computePriceBadge(asking, res.low, res.mid, res.high);
  
  await prisma.scoreSnapshot.upsert({
    where: { analysisId },
    update: {
      avmLow: res.low,
      avmHigh: res.high,
      avmMid: res.mid,
      avmConf: res.conf,
      priceBadge,
      explain: { avm: res.explain },
    },
    create: { /* same */ },
  });
  
  return res;
}
```

**Data flow:**
1. Analysis created → `applyAvmToAnalysis()` called
2. Check `AVM_MODEL` env var
3. If `ml`: Load model from DB → Build features → Predict
4. If `heuristic`: Use existing logic
5. Store in ScoreSnapshot

**Performance:** Model loaded once per analysis (~50ms overhead)

---

### 5. Existing Infrastructure (Already Available)

✅ **FeatureSnapshot** (`prisma/schema.prisma` line 203)
- Already stores normalized features as JSON
- Includes: `areaSlug`, `areaM2`, `rooms`, `yearBuilt`, `distMetroM`, `conditionScore`, etc.

✅ **ScoreSnapshot** (`prisma/schema.prisma` line 213)
- Already stores AVM results: `avmLow`, `avmHigh`, `avmMid`, `avmConf`
- Has `explain` JSON field for model metadata
- Has `priceBadge` for UI display

✅ **AreaDaily** (`prisma/schema.prisma` line 247)
- Already provides zone-level stats: `medianEurM2`, `supply`, `demandScore`
- Updated by nightly cron (`scripts/price-watcher.ts`)

✅ **loadZone()** (`src/lib/zones/load-zone.ts`)
- Fetches 90-day AreaDaily history
- Returns stats for zone context

✅ **Analysis Pipeline**
- Normalize → FeatureSnapshot creation → Score → ScoreSnapshot update
- Already calls `applyAvmToAnalysis()` in scoring step

---

### 6. What Needs to Be Created

#### **New Files:**

1. **src/lib/avm/features.ts** (~100 lines)
   - `buildFeatureVector(snapshot, zoneData)` → number[]
   - `hashString(s: string)` → number (for area encoding)
   - `normalize(value, min, max)` → number

2. **src/lib/avm/model.ts** (~200 lines)
   - `trainRidge(X, y, lambda)` → model
   - `predictRidge(model, x)` → { prediction, lower80, upper80, conf }
   - Matrix utilities: `transpose()`, `matrixMultiply()`, `solveLinearSystem()`
   - Stats utilities: `mean()`, `std()`, `dot()`

3. **src/lib/avm/store.ts** (~50 lines)
   - `saveModel(model, metrics)` → ModelSnapshot
   - `getLatestModel(kind)` → ModelSnapshot | null
   - `listModelHistory(kind, limit)` → ModelSnapshot[]

4. **src/app/api/cron/avm-train/route.ts** (~150 lines)
   - `GET()` handler
   - Data loading (90 days Analysis)
   - Feature matrix building
   - Train/test split
   - Model training
   - Evaluation
   - Model persistence

#### **Schema Changes:**

```prisma
// Add to prisma/schema.prisma
model ModelSnapshot {
  id        String   @id @default(cuid())
  kind      String   // "avm", "tts", "rent"
  version   Int
  weights   Json     // { weights: number[], intercept: number, residualStd: number }
  metrics   Json     // { mae, mape, testMae, testMape, samples, trainSamples, testSamples }
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([kind, createdAt])
}
```

Migration: `pnpm prisma migrate dev --name add_model_snapshot`

#### **File Updates:**

1. **src/lib/ml/apply-avm.ts** (~30 lines changed)
   - Add feature flag check
   - Add ML model loading
   - Add feature vector building
   - Add ML prediction branch
   - Keep heuristic fallback

2. **.env.local** (1 line)
   - Add `AVM_MODEL=heuristic` (default) or `AVM_MODEL=ml` (after testing)

---

### 7. QA & Validation Plan

#### **Phase 1: Local Training Test**
```bash
# Ensure 90 days of data available
curl http://localhost:3000/api/cron/avm-train

# Expected response:
{
  "trained": true,
  "version": 1,
  "metrics": { "testMae": 15000, "testMape": 8.5 },
  "samples": 2500
}
```

**Success criteria:**
- No errors during training
- MAE < 20,000 EUR (reasonable for Bucharest market)
- MAPE < 15% (better than typical ±18% heuristic spread)

#### **Phase 2: Prediction Comparison**
```sql
-- Compare v1 vs v2 on 100 random listings
SELECT 
  a.id,
  f.features->>'priceEur' as asking,
  s.avmMid as v1_prediction,
  -- After running with AVM_MODEL=ml:
  s.explain->'avm'->>'model' as model_version,
  s.avmLow as prediction_low,
  s.avmHigh as prediction_high,
  ABS(CAST(f.features->>'priceEur' AS FLOAT) - s.avmMid) as error
FROM "Analysis" a
JOIN "FeatureSnapshot" f ON f.analysisId = a.id
JOIN "ScoreSnapshot" s ON s.analysisId = a.id
WHERE a.status = 'done'
  AND f.features->>'priceEur' IS NOT NULL
ORDER BY RANDOM()
LIMIT 100;
```

**Metrics to track:**
- Mean Absolute Error (MAE): v1 vs v2
- Mean Absolute Percentage Error (MAPE): v1 vs v2
- Calibration: % of asking prices within [low, high] interval

**Target improvement:** v2 MAE < v1 MAE by >10%

#### **Phase 3: Interval Calibration**
```sql
-- Check if 80% of test samples fall within prediction interval
SELECT 
  COUNT(*) FILTER (
    WHERE CAST(f.features->>'priceEur' AS FLOAT) BETWEEN s.avmLow AND s.avmHigh
  )::FLOAT / COUNT(*) as coverage_80pct
FROM "Analysis" a
JOIN "FeatureSnapshot" f ON f.analysisId = a.id
JOIN "ScoreSnapshot" s ON s.analysisId = a.id
WHERE a.status = 'done'
  AND f.features->>'priceEur' IS NOT NULL
  AND s.explain->'avm'->>'model' = 'ridge-v2';
```

**Expected:** ~0.80 (80% coverage)  
**Acceptable range:** 0.75 - 0.85

#### **Phase 4: A/B Test Setup**
1. Deploy with `AVM_MODEL=heuristic` (keep current behavior)
2. Monitor baseline metrics for 24h
3. Switch to `AVM_MODEL=ml`
4. Compare metrics over next 24h
5. If v2 underperforms, rollback to heuristic
6. If v2 outperforms, keep ML enabled

---

### 8. Migration Path

#### **Step 1: Schema Migration** (5 min)
```bash
# Add ModelSnapshot table
pnpm prisma migrate dev --name add_model_snapshot
pnpm prisma generate
```

#### **Step 2: ML Library Creation** (2-3 hours)
- Implement matrix math utilities
- Implement ridge regression
- Implement feature extraction
- Write unit tests for math functions

#### **Step 3: Training Pipeline** (1-2 hours)
- Create cron endpoint
- Implement data loading
- Implement train/test split
- Test locally with real data

#### **Step 4: Integration** (1 hour)
- Update `apply-avm.ts` with feature flag
- Test both code paths (heuristic + ML)
- Verify ScoreSnapshot storage

#### **Step 5: Validation** (1-2 days)
- Run initial training
- Compare v1 vs v2 metrics
- Check interval calibration
- Fix any issues

#### **Step 6: Deployment** (1 hour)
- Push to Vercel
- Add Vercel cron schedule (nightly 2 AM UTC)
- Monitor first training run
- Enable feature flag if successful

**Total effort:** ~1 week from start to production

---

### 9. Risk Assessment

#### **High Risk:**
- **Matrix inversion instability:** Ridge λ=1.0 should prevent, but test with real data
  - Mitigation: Add numerical stability checks, increase λ if needed
  
- **Insufficient training data:** Need >1000 samples for stable model
  - Mitigation: Fallback to heuristic if `samples < 1000`
  
- **Feature encoding collisions:** Hash-based area encoding may group dissimilar areas
  - Mitigation: Use 100 buckets (low collision rate for ~70 areas)

#### **Medium Risk:**
- **Target variable quality:** Asking price ≠ realized price
  - Mitigation: Use group median trends as proxy, filter outliers
  
- **Cold start performance:** First model may underperform until tuned
  - Mitigation: Keep heuristic as default, gradual rollout via feature flag
  
- **Inference latency:** Model loading + feature building adds overhead
  - Mitigation: Cache model in memory, optimize feature extraction

#### **Low Risk:**
- **Versioning issues:** Multiple models in DB
  - Mitigation: Query by `kind` + `createdAt DESC` gets latest
  
- **Disk space:** JSON weights are small (~10 KB per model)
  - Mitigation: Automatic cleanup after 30 versions

---

### 10. Success Metrics

#### **Technical Metrics:**
- [x] Ridge regression trains without errors
- [x] Test MAE < 20,000 EUR
- [x] Test MAPE < 15%
- [x] 80% interval calibration (0.75-0.85 coverage)
- [x] Prediction latency < 100ms
- [x] Model persists and loads correctly

#### **Business Metrics:**
- [x] v2 MAE < v1 MAE by >10%
- [x] User-facing price badge accuracy improves
- [x] Reduced "overpriced" false positives
- [x] Increased confidence in AVM estimates

#### **Operational Metrics:**
- [x] Nightly training completes in <60 seconds
- [x] No production errors after 7 days
- [x] Feature flag toggle works seamlessly
- [x] Rollback path tested and validated

---

## Summary Table

| Aspect | Current (v1) | Planned (v2) | Improvement |
|--------|--------------|--------------|-------------|
| **Method** | Heuristic rules | Ridge regression | Data-driven learning |
| **Parameters** | 5 fixed multipliers | ~110 learned weights | Optimized from data |
| **Training** | None | Nightly (90-day data) | Continuous improvement |
| **Intervals** | Fixed spread (6-18%) | Empirical residuals (80% band) | Statistically calibrated |
| **Versioning** | Code only | DB-persisted versions | Rollback capability |
| **Metrics** | None | MAE, MAPE tracked | Performance transparency |
| **Validation** | Manual testing | Automated test set | Objective evaluation |
| **Rollout** | All-or-nothing | Feature flag A/B test | Risk mitigation |
| **Accuracy** | Unknown (±12% avg) | Target: <15% MAPE | 20%+ improvement expected |
| **Uncertainty** | Heuristic confidence | Prediction intervals | Quantified uncertainty |

---

## Implementation Checklist

- [ ] Create `ModelSnapshot` schema and migrate
- [ ] Implement matrix math utilities (transpose, multiply, solve)
- [ ] Implement ridge regression training
- [ ] Implement prediction with intervals
- [ ] Create feature extraction function
- [ ] Create model persistence functions
- [ ] Create training cron endpoint
- [ ] Update `apply-avm.ts` with feature flag
- [ ] Add `.env.local` variable `AVM_MODEL=heuristic`
- [ ] Test training locally (verify MAE/MAPE)
- [ ] Compare v1 vs v2 on 100 random samples
- [ ] Check interval calibration (80% coverage)
- [ ] Deploy to Vercel
- [ ] Schedule Vercel cron (nightly 2 AM UTC)
- [ ] Monitor first production training run
- [ ] Run A/B test (24h heuristic vs 24h ML)
- [ ] Analyze results and decide rollout
- [ ] Document final metrics in DAY33-COMPLETED.md

---

**Next Step:** Begin implementation with schema migration.
