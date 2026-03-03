/**
 * Seed script: enqueues discover jobs for Bucharest apartment listing pages.
 * These are category/search pages that contain links to individual listings.
 * The crawl-tick worker will discover individual listing URLs from these.
 * Run with: pnpm scrape:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DISCOVER_URLS = [
  // imobiliare.ro - Bucharest apartments by type
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-garsoniere/bucuresti?pagina=3",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-apartamente-2-camere/bucuresti?pagina=3",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti",
  "https://www.imobiliare.ro/vanzare-apartamente-3-camere/bucuresti?pagina=2",
  "https://www.imobiliare.ro/vanzare-apartamente-4-camere/bucuresti",

  // storia.ro
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=2",
  "https://www.storia.ro/ro/rezultate/vanzare/apartament/bucuresti?page=3",

  // olx.ro
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/",
  "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/bucuresti-ilfov/?page=2",

  // publi24.ro
  "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/",
  "https://www.publi24.ro/anunturi/imobiliare/de-vanzare/apartamente/bucuresti/?pag=2",

  // lajumate.ro
  "https://www.lajumate.ro/vanzari-apartamente/bucuresti/",

  // homezz.ro
  "https://homezz.ro/vanzare-apartamente/bucuresti-if",
  "https://homezz.ro/vanzare-apartamente/bucuresti-if?pagina=2",
];

async function main() {
  console.log(`Seeding ${DISCOVER_URLS.length} discover page URLs...`);

  // Register all listing sources
  const domains = [
    "imobiliare.ro",
    "storia.ro",
    "olx.ro",
    "publi24.ro",
    "lajumate.ro",
    "homezz.ro",
  ];
  for (const domain of domains) {
    await prisma.listingSource
      .upsert({
        where: { domain },
        update: { enabled: true },
        create: { domain, enabled: true, minDelayMs: 2000 },
      })
      .catch(() => {
        console.log(`  (listingSource upsert skipped for ${domain})`);
      });
  }

  let created = 0;
  let skipped = 0;

  for (const url of DISCOVER_URLS) {
    try {
      const linkUrl = new URL(url);
      const normalized = linkUrl.toString();
      const domain = linkUrl.hostname.replace(/^www\./, "");

      await prisma.crawlJob.create({
        data: {
          url,
          normalized,
          domain,
          kind: "discover",
          status: "queued",
          priority: 20,
        },
      });
      created++;
      console.log(`  + [discover] ${url}`);
    } catch {
      skipped++;
      console.log(`  ~ skipped (duplicate): ${url}`);
    }
  }

  console.log(`\nDone: ${created} discover jobs created, ${skipped} skipped`);
  console.log("Run the crawl-tick cron to start processing the queue.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
