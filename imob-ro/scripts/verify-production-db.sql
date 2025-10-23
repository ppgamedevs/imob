-- Verify Production Database Schema
-- Run this in Neon.tech SQL Editor to check if all tables and columns exist

-- 1. Check all required tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'ApiKey' THEN 'Day 36: Public API'
    WHEN table_name = 'ApiUsage' THEN 'Day 36: API Usage Tracking'
    WHEN table_name = 'EmbedUsage' THEN 'Day 36: Widget Analytics'
    WHEN table_name = 'Analysis' THEN 'Core: Analysis Results'
    WHEN table_name = 'UserTaste' THEN 'Day 35: Personalization'
    ELSE 'Other'
  END as feature
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ApiKey', 'ApiUsage', 'EmbedUsage', 'Analysis', 'UserTaste')
ORDER BY table_name;

-- Expected: 5 rows (ApiKey, ApiUsage, EmbedUsage, Analysis, UserTaste)

-- 2. Check Analysis table has contentHash field (Backend Stability)
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'Analysis' 
  AND column_name IN ('contentHash', 'canonicalUrl')
ORDER BY column_name;

-- Expected: 2 rows (canonicalUrl, contentHash)

-- 3. Check indices exist (Backend Stability)
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'Analysis'
  AND indexname IN (
    'Analysis_createdAt_idx',
    'Analysis_contentHash_idx'
  )
ORDER BY indexname;

-- Expected: 2 rows (createdAt index, contentHash index)

-- 4. Check ExtractedListing index
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'ExtractedListing'
  AND indexname = 'ExtractedListing_analysisId_idx';

-- Expected: 1 row (analysisId index)

-- 5. Summary: Count all tables
SELECT 
  COUNT(*) as total_tables,
  COUNT(CASE WHEN table_name = 'ApiKey' THEN 1 END) as has_apikey,
  COUNT(CASE WHEN table_name = 'Analysis' THEN 1 END) as has_analysis
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Expected: total_tables > 20, has_apikey = 1, has_analysis = 1
