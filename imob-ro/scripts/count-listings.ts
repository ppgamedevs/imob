/**
 * Afișează câte apartamente au fost scrape-uite și câte sunt în baza de date.
 * Rulează: pnpm run count-listings
 * (sau: npx dotenv -e .env.local -- tsx scripts/count-listings.ts)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [
    crawlDetailDone,
    crawlDetailError,
    crawlDetailQueued,
    crawlDiscoverDone,
    totalAnalyses,
    analysesDone,
    totalExtracted,
    analysesLast24h,
    extractedWithPrice,
  ] = await Promise.all([
    prisma.crawlJob.count({ where: { kind: "detail", status: "done" } }),
    prisma.crawlJob.count({ where: { kind: "detail", status: "error" } }),
    prisma.crawlJob.count({ where: { kind: "detail", status: "queued" } }),
    prisma.crawlJob.count({ where: { kind: "discover", status: "done" } }),
    prisma.analysis.count(),
    prisma.analysis.count({ where: { status: "done" } }),
    prisma.extractedListing.count(),
    prisma.analysis.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.extractedListing.count({ where: { price: { not: null } } }),
  ]);

  console.log("\n=== SCRAPING (CrawlJob) ===");
  console.log("  URL-uri anunț (detail) procesate cu succes:  ", crawlDetailDone);
  console.log("  URL-uri anunț (detail) în coadă:             ", crawlDetailQueued);
  console.log("  URL-uri anunț (detail) eroare:              ", crawlDetailError);
  console.log("  Pagini discover (liste) procesate:          ", crawlDiscoverDone);

  console.log("\n=== BAZA DE DATE (analize / anunțuri) ===");
  console.log("  Total analize (Analysis):                   ", totalAnalyses);
  console.log("  Analize finalizate (status=done):           ", analysesDone);
  console.log("  Total anunțuri cu date (ExtractedListing):  ", totalExtracted);
  console.log("  Anunțuri cu preț:                            ", extractedWithPrice);
  console.log("  Analize create în ultimele 24h:              ", analysesLast24h);

  console.log("\n");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
