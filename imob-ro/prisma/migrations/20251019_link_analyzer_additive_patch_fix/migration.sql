-- Migration: link_analyzer_additive_patch_fix
-- Created manually to backfill NOT NULL timestamp columns safely

-- ExtractedListing: backfill timestamps safely
ALTER TABLE "ExtractedListing"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- FeatureSnapshot: backfill timestamps safely
ALTER TABLE "FeatureSnapshot"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ScoreSnapshot: ensure timestamps exist (added by schema)
ALTER TABLE "ScoreSnapshot"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Analysis: new index on canonicalUrl
CREATE INDEX IF NOT EXISTS "Analysis_canonicalUrl_idx" ON "Analysis" ("canonicalUrl");

-- Nullable JSON/text columns added
DO $$
BEGIN
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ExtractedListing' AND column_name='sourceMeta') THEN
		ALTER TABLE "ExtractedListing" ADD COLUMN "sourceMeta" JSONB;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ExtractedListing' AND column_name='floorRaw') THEN
		ALTER TABLE "ExtractedListing" ADD COLUMN "floorRaw" TEXT;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ScoreSnapshot' AND column_name='avmMid') THEN
		ALTER TABLE "ScoreSnapshot" ADD COLUMN "avmMid" DOUBLE PRECISION;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ScoreSnapshot' AND column_name='priceBadge') THEN
		ALTER TABLE "ScoreSnapshot" ADD COLUMN "priceBadge" TEXT;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ScoreSnapshot' AND column_name='explain') THEN
		ALTER TABLE "ScoreSnapshot" ADD COLUMN "explain" JSONB;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ScoreSnapshot' AND column_name='riskClass') THEN
		ALTER TABLE "ScoreSnapshot" ADD COLUMN "riskClass" TEXT;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ScoreSnapshot' AND column_name='riskSource') THEN
		ALTER TABLE "ScoreSnapshot" ADD COLUMN "riskSource" TEXT;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ScoreSnapshot' AND column_name='condition') THEN
		ALTER TABLE "ScoreSnapshot" ADD COLUMN "condition" TEXT;
	END IF;
	IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='AreaDaily' AND column_name='stats') THEN
		ALTER TABLE "AreaDaily" ADD COLUMN "stats" JSONB;
	END IF;
END$$;

-- (Optional) keep defaults; you can DROP DEFAULT later if you want
-- ALTER TABLE "ExtractedListing" ALTER COLUMN "updatedAt" DROP DEFAULT;
-- ALTER TABLE "FeatureSnapshot"  ALTER COLUMN "updatedAt" DROP DEFAULT;
-- ALTER TABLE "ScoreSnapshot"    ALTER COLUMN "updatedAt" DROP DEFAULT;
