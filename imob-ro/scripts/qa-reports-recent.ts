/**
 * Ultimele 20 de analize, câmpuri QA (fără a modifica date).
 *
 *   pnpm qa:reports:recent
 *   pnpm exec tsx scripts/qa-reports-recent.ts
 *
 * Necesită DATABASE_URL (și opțional NEXT_PUBLIC_SITE_URL pentru URL-uri de raport).
 */
import { config } from "dotenv";

import { prisma } from "@/lib/db";
import { getRecentReportQaSnapshots } from "@/lib/qa/report-qa-snapshot";

config({ path: ".env.local" });
config({ path: ".env" });

const N = Number.parseInt(process.env.QA_RECENT_N ?? "20", 10) || 20;

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL este necesar.");
    process.exit(1);
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL;
  const rows = await getRecentReportQaSnapshots(N, base);
  for (const s of rows) {
    const line = [
      s.analysisId,
      s.portal,
      s.status,
      s.sellability,
      s.paywallShown ? "paywall" : "fără paywall",
      s.compCount,
      s.confidenceLevel ?? "—",
      s.reportUrl,
    ].join(" | ");
    console.log(line);
  }
  console.log(`\n(n=${rows.length})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
