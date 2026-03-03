/**
 * Seed script: Bucharest notarial grid (Grila Notarilor) 2025
 * Values are approximate EUR/mp based on public ANCPI/Camera Notarilor data.
 * Run: pnpm tsx scripts/seed-notarial-grid.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const YEAR = 2025;
const SOURCE = "Camera Notarilor Publici Bucuresti";

interface ZoneEntry {
  zone: string;
  sector: number;
  neighborhood: string;
  minEurPerM2: number;
  maxEurPerM2?: number;
}

const zones: ZoneEntry[] = [
  // Sector 1
  { zone: "S1 - Aviatorilor", sector: 1, neighborhood: "Aviatorilor", minEurPerM2: 1650, maxEurPerM2: 2200 },
  { zone: "S1 - Dorobanti", sector: 1, neighborhood: "Dorobanti", minEurPerM2: 1600, maxEurPerM2: 2100 },
  { zone: "S1 - Herastrau", sector: 1, neighborhood: "Herastrau", minEurPerM2: 1700, maxEurPerM2: 2400 },
  { zone: "S1 - Primaverii", sector: 1, neighborhood: "Primaverii", minEurPerM2: 1800, maxEurPerM2: 2500 },
  { zone: "S1 - Floreasca", sector: 1, neighborhood: "Floreasca", minEurPerM2: 1500, maxEurPerM2: 2000 },
  { zone: "S1 - Baneasa", sector: 1, neighborhood: "Baneasa", minEurPerM2: 1300, maxEurPerM2: 1800 },
  { zone: "S1 - Bucurestii Noi", sector: 1, neighborhood: "Bucurestii Noi", minEurPerM2: 900, maxEurPerM2: 1300 },
  { zone: "S1 - Chitila", sector: 1, neighborhood: "Chitila", minEurPerM2: 800, maxEurPerM2: 1100 },
  { zone: "S1 - Pajura", sector: 1, neighborhood: "Pajura", minEurPerM2: 950, maxEurPerM2: 1350 },
  { zone: "S1 - Domenii", sector: 1, neighborhood: "Domenii", minEurPerM2: 1200, maxEurPerM2: 1600 },
  { zone: "S1 - Kisseleff", sector: 1, neighborhood: "Kisseleff", minEurPerM2: 1700, maxEurPerM2: 2300 },
  { zone: "S1 - Victoriei", sector: 1, neighborhood: "Victoriei", minEurPerM2: 1400, maxEurPerM2: 1900 },

  // Sector 2
  { zone: "S2 - Colentina", sector: 2, neighborhood: "Colentina", minEurPerM2: 750, maxEurPerM2: 1050 },
  { zone: "S2 - Iancului", sector: 2, neighborhood: "Iancului", minEurPerM2: 950, maxEurPerM2: 1300 },
  { zone: "S2 - Obor", sector: 2, neighborhood: "Obor", minEurPerM2: 900, maxEurPerM2: 1250 },
  { zone: "S2 - Pantelimon", sector: 2, neighborhood: "Pantelimon", minEurPerM2: 650, maxEurPerM2: 950 },
  { zone: "S2 - Tei", sector: 2, neighborhood: "Tei", minEurPerM2: 900, maxEurPerM2: 1200 },
  { zone: "S2 - Mosilor", sector: 2, neighborhood: "Mosilor", minEurPerM2: 1000, maxEurPerM2: 1400 },
  { zone: "S2 - Baicului", sector: 2, neighborhood: "Baicului", minEurPerM2: 800, maxEurPerM2: 1100 },
  { zone: "S2 - Fundeni", sector: 2, neighborhood: "Fundeni", minEurPerM2: 600, maxEurPerM2: 850 },
  { zone: "S2 - Andronache", sector: 2, neighborhood: "Andronache", minEurPerM2: 650, maxEurPerM2: 900 },

  // Sector 3
  { zone: "S3 - Dristor", sector: 3, neighborhood: "Dristor", minEurPerM2: 900, maxEurPerM2: 1250 },
  { zone: "S3 - Titan", sector: 3, neighborhood: "Titan", minEurPerM2: 850, maxEurPerM2: 1150 },
  { zone: "S3 - Balta Alba", sector: 3, neighborhood: "Balta Alba", minEurPerM2: 800, maxEurPerM2: 1100 },
  { zone: "S3 - Unirii", sector: 3, neighborhood: "Unirii", minEurPerM2: 1200, maxEurPerM2: 1700 },
  { zone: "S3 - Vitan", sector: 3, neighborhood: "Vitan", minEurPerM2: 850, maxEurPerM2: 1200 },
  { zone: "S3 - Dudesti", sector: 3, neighborhood: "Dudesti", minEurPerM2: 800, maxEurPerM2: 1100 },
  { zone: "S3 - 1 Decembrie", sector: 3, neighborhood: "1 Decembrie", minEurPerM2: 700, maxEurPerM2: 950 },
  { zone: "S3 - Splaiul Unirii", sector: 3, neighborhood: "Splaiul Unirii", minEurPerM2: 1100, maxEurPerM2: 1500 },

  // Sector 4
  { zone: "S4 - Berceni", sector: 4, neighborhood: "Berceni", minEurPerM2: 750, maxEurPerM2: 1050 },
  { zone: "S4 - Aparatorii Patriei", sector: 4, neighborhood: "Aparatorii Patriei", minEurPerM2: 700, maxEurPerM2: 1000 },
  { zone: "S4 - Tineretului", sector: 4, neighborhood: "Tineretului", minEurPerM2: 1050, maxEurPerM2: 1450 },
  { zone: "S4 - Brancoveanu", sector: 4, neighborhood: "Brancoveanu", minEurPerM2: 800, maxEurPerM2: 1100 },
  { zone: "S4 - Oltenitei", sector: 4, neighborhood: "Oltenitei", minEurPerM2: 700, maxEurPerM2: 950 },
  { zone: "S4 - Piata Sudului", sector: 4, neighborhood: "Piata Sudului", minEurPerM2: 850, maxEurPerM2: 1150 },
  { zone: "S4 - Progresul", sector: 4, neighborhood: "Progresul", minEurPerM2: 750, maxEurPerM2: 1050 },

  // Sector 5
  { zone: "S5 - Rahova", sector: 5, neighborhood: "Rahova", minEurPerM2: 600, maxEurPerM2: 850 },
  { zone: "S5 - 13 Septembrie", sector: 5, neighborhood: "13 Septembrie", minEurPerM2: 1100, maxEurPerM2: 1500 },
  { zone: "S5 - Cotroceni", sector: 5, neighborhood: "Cotroceni", minEurPerM2: 1200, maxEurPerM2: 1650 },
  { zone: "S5 - Ferentari", sector: 5, neighborhood: "Ferentari", minEurPerM2: 450, maxEurPerM2: 700 },
  { zone: "S5 - Sebastian", sector: 5, neighborhood: "Sebastian", minEurPerM2: 750, maxEurPerM2: 1050 },
  { zone: "S5 - Ghencea", sector: 5, neighborhood: "Ghencea", minEurPerM2: 700, maxEurPerM2: 1000 },
  { zone: "S5 - Panduri", sector: 5, neighborhood: "Panduri", minEurPerM2: 1000, maxEurPerM2: 1400 },

  // Sector 6
  { zone: "S6 - Drumul Taberei", sector: 6, neighborhood: "Drumul Taberei", minEurPerM2: 900, maxEurPerM2: 1250 },
  { zone: "S6 - Militari", sector: 6, neighborhood: "Militari", minEurPerM2: 850, maxEurPerM2: 1200 },
  { zone: "S6 - Crangasi", sector: 6, neighborhood: "Crangasi", minEurPerM2: 900, maxEurPerM2: 1300 },
  { zone: "S6 - Giulesti", sector: 6, neighborhood: "Giulesti", minEurPerM2: 750, maxEurPerM2: 1050 },
  { zone: "S6 - Lujerului", sector: 6, neighborhood: "Lujerului", minEurPerM2: 950, maxEurPerM2: 1350 },
  { zone: "S6 - Pacii", sector: 6, neighborhood: "Pacii", minEurPerM2: 800, maxEurPerM2: 1100 },
  { zone: "S6 - Virtutii", sector: 6, neighborhood: "Virtutii", minEurPerM2: 850, maxEurPerM2: 1200 },
  { zone: "S6 - Apusului", sector: 6, neighborhood: "Apusului", minEurPerM2: 800, maxEurPerM2: 1100 },
  { zone: "S6 - Gorjului", sector: 6, neighborhood: "Gorjului", minEurPerM2: 850, maxEurPerM2: 1200 },
];

async function main() {
  console.log(`Seeding NotarialGrid: ${zones.length} zones for year ${YEAR}...`);

  let created = 0;
  let updated = 0;

  for (const z of zones) {
    const result = await prisma.notarialGrid.upsert({
      where: {
        zone_propertyType_year: {
          zone: z.zone,
          propertyType: "apartment",
          year: YEAR,
        },
      },
      update: {
        minEurPerM2: z.minEurPerM2,
        maxEurPerM2: z.maxEurPerM2 ?? null,
        sector: z.sector,
        neighborhood: z.neighborhood,
        source: SOURCE,
      },
      create: {
        zone: z.zone,
        city: "București",
        sector: z.sector,
        neighborhood: z.neighborhood,
        propertyType: "apartment",
        minEurPerM2: z.minEurPerM2,
        maxEurPerM2: z.maxEurPerM2 ?? null,
        year: YEAR,
        source: SOURCE,
      },
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Done: ${created} created, ${updated} updated.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
