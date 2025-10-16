/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample Link Analyzer data...");

  const user = await prisma.user.findFirst();

  const analysis = await prisma.analysis.create({
    data: {
      userId: user ? user.id : null,
      sourceUrl: "https://example.com/listing/123",
      canonicalUrl: "https://example.com/listing/123",
      status: "completed",
    },
  });

  await prisma.extractedListing.create({
    data: {
      analysisId: analysis.id,
      title: "Apartament 2 camere - Exemplu",
      price: 85000,
      currency: "EUR",
      areaM2: 55,
      rooms: 2,
      floor: 3,
      yearBuilt: 1990,
      addressRaw: "Str. Exemplu 10, Sector 1, București",
      lat: 44.4325,
      lng: 26.1039,
      photos: JSON.stringify(["https://picsum.photos/800/450"]),
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
