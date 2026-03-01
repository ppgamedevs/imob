/**
 * Seed script: enqueues 20 sample imobiliare.ro listing URLs for testing.
 * Run with: pnpm scrape:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_URLS = [
  // Garsoniere
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti/militari/garsoniera-de-vanzare-X001",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti/drumul-taberei/garsoniera-de-vanzare-X002",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti/titan/garsoniera-de-vanzare-X003",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti/rahova/garsoniera-de-vanzare-X004",
  // 2 camere
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/floreasca/apartament-de-vanzare-2-camere-X005",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/tineretului/apartament-de-vanzare-2-camere-X006",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/dristor/apartament-de-vanzare-2-camere-X007",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/crangasi/apartament-de-vanzare-2-camere-X008",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/obor/apartament-de-vanzare-2-camere-X009",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/berceni/apartament-de-vanzare-2-camere-X010",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/panduri/apartament-de-vanzare-2-camere-X011",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/victoriei/apartament-de-vanzare-2-camere-X012",
  // 3 camere
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/herastrau/apartament-de-vanzare-3-camere-X013",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/dorobanti/apartament-de-vanzare-3-camere-X014",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/aviatorilor/apartament-de-vanzare-3-camere-X015",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/unirii/apartament-de-vanzare-3-camere-X016",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/cotroceni/apartament-de-vanzare-3-camere-X017",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/stefan-cel-mare/apartament-de-vanzare-3-camere-X018",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/pipera/apartament-de-vanzare-3-camere-X019",
  "https://www.imobiliare.ro/vanzare-apartamente/bucuresti/colentina/apartament-de-vanzare-3-camere-X020",
];

async function main() {
  console.log(`Seeding ${SEED_URLS.length} listing URLs...`);

  let created = 0;
  let skipped = 0;

  for (const url of SEED_URLS) {
    try {
      const normalized = new URL(url).toString();
      const domain = new URL(url).hostname.replace(/^www\./, "");

      await prisma.crawlJob.create({
        data: {
          url,
          normalized,
          domain,
          kind: "detail",
          status: "queued",
          priority: 10,
        },
      });
      created++;
      console.log(`  + ${url}`);
    } catch {
      skipped++;
      console.log(`  ~ skipped (duplicate): ${url}`);
    }
  }

  console.log(`Done: ${created} created, ${skipped} skipped`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
