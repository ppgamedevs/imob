/**
 * Demo data seeder
 * Step 15: Final Polish
 *
 * Run with: pnpm seed:demo
 */

import { prisma } from "@/lib/db";
import {
  PUBLIC_SAMPLE_REPORT_ANALYSIS_ID,
  PUBLIC_SAMPLE_SOURCE_URL,
} from "@/lib/report/sample-public-report";

/** Full report demonstrativ: date fictive, fără anunț real. Sincronizat cu /raport-exemplu. */
async function seedPublicSampleReport() {
  const id = PUBLIC_SAMPLE_REPORT_ANALYSIS_ID;
  const title = "Apartament 2 camere (exemplu demonstrativ), Crângași";
  const price = 88_000;
  const area = 52;
  const lat = 44.4578;
  const lng = 26.0524;
  const slug = "crangasi";
  const eurM2 = Math.round(price / area);

  await prisma.compMatch.deleteMany({ where: { analysisId: id } });
  await prisma.analysis.delete({ where: { id } }).catch(() => undefined);

  const analysis = await prisma.analysis.create({
    data: {
      id,
      sourceUrl: PUBLIC_SAMPLE_SOURCE_URL,
      status: "done",
      extractedListing: {
        create: {
          title,
          price,
          currency: "EUR",
          areaM2: area,
          rooms: 2,
          floor: 3,
          yearBuilt: 2005,
          addressRaw: "Zonă Crângași, exemplu demonstrativ, București",
          lat,
          lng,
          photos: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&w=800&q=80",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&w=800&q=80",
          ],
          sourceMeta: {
            host: "imobintel-exemplu",
            demonstrativ: true,
            description: "Text scurt de fișă, demonstrativ, pentru previzualizare.",
          },
        },
      },
      featureSnapshot: {
        create: {
          features: {
            city: "București",
            areaSlug: slug,
            priceEur: price,
            areaM2: area,
            eurM2,
            distMetroM: 480,
            rooms: 2,
            floor: 3,
            yearBuilt: 2005,
            lat,
            lng,
            addressRaw: "Zonă Crângași, exemplu demonstrativ, București",
          },
        },
      },
      scoreSnapshot: {
        create: {
          avmMid: Math.round(price * 0.98),
          avmLow: Math.round(price * 0.9),
          avmHigh: Math.round(price * 1.06),
          avmConf: 0.72,
          priceBadge: "fair",
          ttsBucket: "45-70",
          yieldNet: 4.2,
          yieldGross: 4.5,
          riskClass: "RS2",
          conditionScore: 0.62,
          explain: {
            avm: { basePrediction: Math.round(price * 0.98), adjustments: [] },
            tts: { factors: ["location", "price"] },
            yield: { rental: Math.round(price * 0.004) },
            comps: { eurM2: { median: eurM2, q1: eurM2 * 0.95, q3: eurM2 * 1.05 } },
            confidence: { level: "medium", score: 68 },
            seismic: { class: "RS2" },
          },
        },
      },
    },
  });

  const analysisId = analysis.id;
  const demoComps = [
    { title: "Comparabil 1 (exemplu)", priceEur: 86_000, areaM2: 50, dist: 120, eurM2: 1720, score: 0.9 },
    { title: "Comparabil 2 (exemplu)", priceEur: 90_000, areaM2: 54, dist: 200, eurM2: 1667, score: 0.85 },
    { title: "Comparabil 3 (exemplu)", priceEur: 84_000, areaM2: 48, dist: 350, eurM2: 1750, score: 0.8 },
    { title: "Comparabil 4 (exemplu)", priceEur: 89_000, areaM2: 51, dist: 410, eurM2: 1745, score: 0.75 },
  ];
  await prisma.compMatch.createMany({
    data: demoComps.map((c, i) => ({
      analysisId,
      title: c.title,
      sourceUrl: `https://exemplu.imobintel.ro/vanzari/comp-exemplu-${i + 1}`,
      priceEur: c.priceEur,
      areaM2: c.areaM2,
      distanceM: c.dist,
      eurM2: c.eurM2,
      rooms: 2,
      score: c.score,
      yearBuilt: 2003 + i,
      lat: lat + i * 0.0002,
      lng: lng + i * 0.0001,
      photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&w=40&q=60",
    })),
  });

  console.log("  ✓ Raport public exemplu (fictiv) upsert: /raport-exemplu");
}

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

  await seedPublicSampleReport();

  console.log("✅ Demo data seeded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  });
