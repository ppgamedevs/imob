/**
 * Re-queue known listings for a fresh scrape.
 * Run with: pnpm scrape:recent
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const recentAnalyses = await prisma.analysis.findMany({
    where: { status: "done", createdAt: { gte: cutoff } },
    select: { sourceUrl: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  const urls = [...new Set(recentAnalyses.map((a) => a.sourceUrl).filter(Boolean))];
  console.log(`Re-queuing ${urls.length} recent listings for refresh...`);

  let created = 0;
  for (const url of urls) {
    try {
      const normalized = new URL(url).toString();
      const domain = new URL(url).hostname.replace(/^www\./, "");

      await prisma.crawlJob.create({
        data: {
          url,
          normalized: `${normalized}#refresh-${Date.now()}`,
          domain,
          kind: "detail",
          status: "queued",
          priority: 50,
        },
      });
      created++;
    } catch {
      // likely duplicate
    }
  }

  console.log(`Done: ${created} jobs created`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
