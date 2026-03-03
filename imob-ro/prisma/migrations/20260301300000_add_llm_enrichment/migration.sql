-- AlterTable: Add LLM enrichment fields to ExtractedListing
ALTER TABLE "ExtractedListing" ADD COLUMN "llmTextExtract" JSONB;
ALTER TABLE "ExtractedListing" ADD COLUMN "llmVisionExtract" JSONB;
ALTER TABLE "ExtractedListing" ADD COLUMN "llmEnrichedAt" TIMESTAMP(3);
ALTER TABLE "ExtractedListing" ADD COLUMN "llmVisionAt" TIMESTAMP(3);
