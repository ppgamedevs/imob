/*
  scripts/area-aggregator.ts
  - computes rolling 30-day demandScore per area and upserts AreaDaily
*/
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const db = prisma as unknown as Record<string, unknown>;

  // get list of known area slugs from Area table
  const areaModel = db["area"] as { findMany: (args: unknown) => Promise<Array<{ slug: string }>> };
  const areas = (await areaModel.findMany({ select: { slug: true } })) as Array<{ slug: string }>;
  const slugs = areas.map((a) => a.slug);

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  for (const slug of slugs) {
    // sum views and saves over the rolling window
    const areaEventModel = db["areaEvent"] as {
      findMany: (args: unknown) => Promise<Array<{ count: number }>>;
    };

    const views = await areaEventModel.findMany({
      where: { areaSlug: slug, event: "view_report", date: { gte: start, lt: end } },
      select: { count: true },
    });
    const saves = await areaEventModel.findMany({
      where: { areaSlug: slug, event: "save_report", date: { gte: start, lt: end } },
      select: { count: true },
    });

    const viewsSum = views.reduce((s, r) => s + (r.count ?? 0), 0);
    const savesSum = saves.reduce((s, r) => s + (r.count ?? 0), 0);

    // supply: count of active listings in area (approx)
    const listingModel = db["listing"] as { count: (args: unknown) => Promise<number> };
    const supply = await listingModel.count({ where: { status: "active" } });

    const demandScore = supply > 0 ? (viewsSum + savesSum) / supply : 0;

    // upsert AreaDaily for today
    const today = new Date();
    const dateOnly = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );

    const areaDailyModel = db["areaDaily"] as {
      upsert: (args: unknown) => Promise<unknown>;
    };

    await areaDailyModel.upsert({
      where: { areaSlug_date: { areaSlug: slug, date: dateOnly } },
      create: {
        areaSlug: slug,
        date: dateOnly,
        medianEurM2: 1500,
        supply: supply,
        demandScore: demandScore,
      },
      update: {
        medianEurM2: 1500,
        supply: supply,
        demandScore: demandScore,
      },
    } as unknown);
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
