/**
 * Demo data seeder
 * Step 15: Final Polish
 *
 * Run with: pnpm seed:demo
 */

import { prisma } from "@/lib/db";

async function main() {
  console.log("🌱 Seeding demo data...");

  // 1. Create areas
  console.log("  📍 Creating areas...");
  await prisma.area.upsert({
    where: { slug: "crangasi" },
    update: {},
    create: {
      slug: "crangasi",
      name: "Crângași",
      city: "București",
    },
  });

  await prisma.area.upsert({
    where: { slug: "floreasca" },
    update: {},
    create: {
      slug: "floreasca",
      name: "Floreasca",
      city: "București",
    },
  });

  // 2. Create AreaDaily history (last 180 days with realistic trends)
  console.log("  📊 Creating area history...");
  const today = new Date();

  for (const slug of ["crangasi", "floreasca"]) {
    let basePrice = slug === "floreasca" ? 2700 : 1750;

    for (let i = 180; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 86400000);
      const dateStr = date.toISOString().slice(0, 10);

      // Add realistic price wave
      basePrice *= 1 + Math.sin(i / 22) / 5000;

      await prisma.areaDaily.upsert({
        where: {
          areaSlug_date: {
            areaSlug: slug,
            date: dateStr as any,
          },
        },
        update: {
          medianEurM2: Math.round(basePrice),
        },
        create: {
          areaSlug: slug,
          date: dateStr as any,
          medianEurM2: Math.round(basePrice),
          demandScore: 0.5 + Math.random() * 0.3,
        },
      });
    }
  }

  // 3. Create sample analyses with full snapshots
  console.log("  🏠 Creating sample analyses...");

  const createAnalysis = async (
    title: string,
    price: number,
    area: number,
    slug: string,
    lat: number,
    lng: number,
  ) => {
    const analysis = await prisma.analysis.create({
      data: {
        sourceUrl: `https://demo.imob.ro/${slug}/${title.toLowerCase().replace(/\s+/g, "-")}`,
        status: "done",
      },
    });

    // Extracted listing
    await prisma.extractedListing.create({
      data: {
        analysisId: analysis.id,
        title,
        price,
        currency: "EUR",
        areaM2: area,
        rooms: area > 50 ? 3 : 2,
        floor: 3,
        yearBuilt: 1982 + Math.floor(Math.random() * 30),
        addressRaw: `${slug} demo, București`,
        lat,
        lng,
        photos: ["/demo/apt1.jpg", "/demo/apt2.jpg", "/demo/apt3.jpg", "/demo/apt4.jpg"],
        sourceMeta: { host: "demo", scrapedAt: new Date().toISOString() },
      },
    });

    // Feature snapshot
    const eurM2 = Math.round(price / area);
    await prisma.featureSnapshot.create({
      data: {
        analysisId: analysis.id,
        features: {
          city: "București",
          areaSlug: slug,
          priceEur: price,
          areaM2: area,
          eurM2,
          distMetroM: 420 + Math.random() * 500,
          rooms: area > 50 ? 3 : 2,
          floor: 3,
          yearBuilt: 1982 + Math.floor(Math.random() * 30),
        },
      },
    });

    // Score snapshot
    const avmMid = Math.round(price * (0.95 + Math.random() * 0.1));
    const priceDiff = ((price - avmMid) / avmMid) * 100;
    const priceBadge = priceDiff < -5 ? "under" : priceDiff > 5 ? "over" : "fair";

    await prisma.scoreSnapshot.create({
      data: {
        analysisId: analysis.id,
        avmMid,
        avmLow: Math.round(avmMid * 0.92),
        avmHigh: Math.round(avmMid * 1.08),
        priceBadge,
        ttsBucket: ["30-45", "45-70", "70-100"][Math.floor(Math.random() * 3)],
        yieldNet: 4.5 + Math.random() * 3,
        riskClass: ["RS1", "RS2", "RS3"][Math.floor(Math.random() * 3)],
        conditionScore: 0.5 + Math.random() * 0.3,
        explain: {
          avm: {
            basePrediction: avmMid,
            adjustments: [],
          },
          tts: {
            factors: ["location", "price", "condition"],
          },
          yield: {
            rental: Math.round(price * 0.005),
          },
          seismic: {
            class: "RS2",
          },
        },
      },
    });

    console.log(`    ✓ ${title}`);
  };

  // Create diverse listings
  await createAnalysis("Garsonieră cozy Crângași", 56000, 26, "crangasi", 44.4578, 26.0524);
  await createAnalysis("2 camere Crângași renovat", 88000, 52, "crangasi", 44.4585, 26.0515);
  await createAnalysis("3 camere Crângași spatios", 125000, 75, "crangasi", 44.4572, 26.053);
  await createAnalysis("2 camere Floreasca", 168000, 58, "floreasca", 44.4589, 26.1051);
  await createAnalysis("3 camere Floreasca luxury", 245000, 85, "floreasca", 44.4595, 26.1045);
  await createAnalysis("Penthouse Floreasca", 385000, 120, "floreasca", 44.46, 26.1055);

  console.log("✅ Demo data seeded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  });
