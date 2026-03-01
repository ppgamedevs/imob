/**
 * Area aggregator: computes rolling 30-day demand scores and supply counts per area.
 * Uses Analysis/FeatureSnapshot (crawled data) instead of Listing for supply.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const areas = await prisma.area.findMany({ select: { slug: true } });
  const slugs = areas.map((a) => a.slug);

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  for (const slug of slugs) {
    const views = await prisma.areaEvent.findMany({
      where: { areaSlug: slug, event: "view_report", date: { gte: start, lt: end } },
      select: { count: true },
    });
    const saves = await prisma.areaEvent.findMany({
      where: { areaSlug: slug, event: "save_report", date: { gte: start, lt: end } },
      select: { count: true },
    });

    const viewsSum = views.reduce((s, r) => s + (r.count ?? 0), 0);
    const savesSum = saves.reduce((s, r) => s + (r.count ?? 0), 0);

    // Supply: count done analyses in this area within the 30-day window
    const supply = await prisma.analysis.count({
      where: {
        status: "done",
        createdAt: { gte: start, lt: end },
        group: { areaSlug: slug },
        featureSnapshot: { isNot: null },
      },
    });

    // Compute median EUR/m2 from recent ScoreSnapshots in this area
    const recentScores = await prisma.scoreSnapshot.findMany({
      where: {
        analysis: {
          status: "done",
          createdAt: { gte: start, lt: end },
          group: { areaSlug: slug },
        },
        avmLow: { not: null },
        avmHigh: { not: null },
      },
      select: { avmLow: true, avmHigh: true },
      take: 200,
    });

    let medianEurM2 = 1500; // fallback
    if (recentScores.length > 0) {
      const mids = recentScores
        .map((s) => ((s.avmLow ?? 0) + (s.avmHigh ?? 0)) / 2)
        .filter((v) => v > 0)
        .sort((a, b) => a - b);
      if (mids.length > 0) {
        medianEurM2 = mids[Math.floor(mids.length / 2)];
      }
    }

    const demandScore = supply > 0 ? (viewsSum + savesSum) / supply : 0;

    const today = new Date();
    const dateOnly = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    await prisma.areaDaily.upsert({
      where: { areaSlug_date: { areaSlug: slug, date: dateOnly } },
      create: {
        areaSlug: slug,
        date: dateOnly,
        medianEurM2,
        supply,
        demandScore,
      },
      update: {
        medianEurM2,
        supply,
        demandScore,
      },
    });

    console.log(`[area-aggregator] ${slug}: supply=${supply}, demand=${demandScore.toFixed(2)}, median=${medianEurM2.toFixed(0)}`);
  }

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
