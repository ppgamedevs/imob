-- AlterTable: add riskSeismicUrl to ScoreSnapshot
ALTER TABLE "ScoreSnapshot" ADD COLUMN IF NOT EXISTS "riskSeismicUrl" TEXT;
