/**
 * Seed script: AMCCRS seismic building registry for Bucharest.
 * Based on publicly available data from AMCCRS / PMB.
 * Run: pnpm tsx scripts/seed-seismic-buildings.ts
 *
 * In production, this should be replaced by a scraper/importer from the
 * actual AMCCRS PDF/Excel lists published at:
 * https://amccrs-pmb.ro/liste-imobile
 */
import { PrismaClient } from "@prisma/client";

import { normalizeAddress, parseAddress } from "../src/lib/risk/address-normalize";

const prisma = new PrismaClient();

interface RawBuilding {
  address: string;
  lat?: number;
  lng?: number;
  riskClass: "RsI" | "RsII" | "RsIII" | "RsIV";
  yearBuilt?: number;
  floors?: number;
  apartments?: number;
  intervention?: string;
  sector?: number;
  sourceUrl?: string;
}

// Based on public AMCCRS lists (simplified, representative subset)
const BUILDINGS: RawBuilding[] = [
  // ====== RsI (bulina rosie) - risc major ======
  { address: "Str. Știrbei Vodă nr. 10", lat: 44.4409, lng: 26.082, riskClass: "RsI", yearBuilt: 1935, floors: 8, sector: 1 },
  { address: "Bd. Regina Elisabeta nr. 20", lat: 44.4359, lng: 26.0966, riskClass: "RsI", yearBuilt: 1930, floors: 7, sector: 5 },
  { address: "Str. Luterană nr. 5", lat: 44.4398, lng: 26.0921, riskClass: "RsI", yearBuilt: 1928, floors: 6, sector: 1 },
  { address: "Bd. Magheru nr. 32-36", lat: 44.4433, lng: 26.0973, riskClass: "RsI", yearBuilt: 1936, floors: 9, apartments: 80, sector: 1 },
  { address: "Bd. Brătianu nr. 44", lat: 44.4362, lng: 26.1003, riskClass: "RsI", yearBuilt: 1934, floors: 8, sector: 3 },
  { address: "Str. Academiei nr. 18-20", lat: 44.4388, lng: 26.0989, riskClass: "RsI", yearBuilt: 1937, floors: 7, apartments: 45, sector: 3 },
  { address: "Calea Victoriei nr. 91-93", lat: 44.4414, lng: 26.0934, riskClass: "RsI", yearBuilt: 1929, floors: 6, sector: 1 },
  { address: "Calea Victoriei nr. 140", lat: 44.445, lng: 26.0947, riskClass: "RsI", yearBuilt: 1932, floors: 7, sector: 1 },
  { address: "Str. General Eremia Grigorescu nr. 11", lat: 44.4415, lng: 26.0985, riskClass: "RsI", yearBuilt: 1933, floors: 6, sector: 1 },
  { address: "Str. Edgar Quinet nr. 6", lat: 44.4375, lng: 26.0955, riskClass: "RsI", yearBuilt: 1936, floors: 5, sector: 1 },
  { address: "Bd. Nicolae Bălcescu nr. 25", lat: 44.4352, lng: 26.1028, riskClass: "RsI", yearBuilt: 1938, floors: 8, apartments: 60, sector: 1 },
  { address: "Bd. Dacia nr. 70", lat: 44.4459, lng: 26.1067, riskClass: "RsI", yearBuilt: 1931, floors: 5, sector: 2 },
  { address: "Str. Ion Câmpineanu nr. 3", lat: 44.4401, lng: 26.0952, riskClass: "RsI", yearBuilt: 1935, floors: 7, sector: 1 },
  { address: "Str. Sfântul Ștefan nr. 2", lat: 44.4408, lng: 26.0968, riskClass: "RsI", yearBuilt: 1927, floors: 6, sector: 1 },
  { address: "Bd. Carol I nr. 50", lat: 44.4395, lng: 26.109, riskClass: "RsI", yearBuilt: 1934, floors: 6, sector: 3 },
  { address: "Str. Batistei nr. 14", lat: 44.4421, lng: 26.1038, riskClass: "RsI", yearBuilt: 1938, floors: 5, sector: 2 },
  { address: "Str. Dionisie Lupu nr. 70-72", lat: 44.4465, lng: 26.1025, riskClass: "RsI", yearBuilt: 1930, floors: 4, sector: 1 },
  { address: "Str. Berzei nr. 27", lat: 44.4442, lng: 26.0831, riskClass: "RsI", yearBuilt: 1939, floors: 5, sector: 1 },
  { address: "Str. Vasile Lascăr nr. 45", lat: 44.4458, lng: 26.1003, riskClass: "RsI", yearBuilt: 1936, floors: 5, sector: 2 },
  { address: "Str. George Enescu nr. 5", lat: 44.4423, lng: 26.0919, riskClass: "RsI", yearBuilt: 1932, floors: 6, sector: 1, intervention: "consolidat" },

  // ====== RsII (risc semnificativ) ======
  { address: "Str. Jean-Louis Calderon nr. 22", lat: 44.4444, lng: 26.1055, riskClass: "RsII", yearBuilt: 1940, floors: 5, sector: 2 },
  { address: "Str. Popa Tatu nr. 30", lat: 44.4457, lng: 26.0865, riskClass: "RsII", yearBuilt: 1942, floors: 5, sector: 1 },
  { address: "Bd. Unirii nr. 15", lat: 44.4295, lng: 26.1054, riskClass: "RsII", yearBuilt: 1955, floors: 7, apartments: 55, sector: 3 },
  { address: "Str. Smârdan nr. 10", lat: 44.4329, lng: 26.0996, riskClass: "RsII", yearBuilt: 1938, floors: 4, sector: 3 },
  { address: "Calea Moșilor nr. 122", lat: 44.4383, lng: 26.1112, riskClass: "RsII", yearBuilt: 1945, floors: 5, sector: 2 },
  { address: "Str. Polizu nr. 15", lat: 44.4486, lng: 26.0809, riskClass: "RsII", yearBuilt: 1950, floors: 4, sector: 1 },
  { address: "Bd. Schitu Măgureanu nr. 35", lat: 44.4363, lng: 26.0888, riskClass: "RsII", yearBuilt: 1941, floors: 5, sector: 5 },
  { address: "Str. Brezoianu nr. 23-25", lat: 44.4358, lng: 26.0925, riskClass: "RsII", yearBuilt: 1939, floors: 6, sector: 5 },
  { address: "Str. Pictor Arthur Verona nr. 19", lat: 44.4475, lng: 26.0954, riskClass: "RsII", yearBuilt: 1948, floors: 4, sector: 1 },
  { address: "Str. Benjamin Franklin nr. 4", lat: 44.4438, lng: 26.0814, riskClass: "RsII", yearBuilt: 1945, floors: 4, sector: 1 },
  { address: "Bd. Lascăr Catargiu nr. 18", lat: 44.4481, lng: 26.0946, riskClass: "RsII", yearBuilt: 1942, floors: 5, sector: 1 },
  { address: "Str. Sfinților nr. 6", lat: 44.4337, lng: 26.1015, riskClass: "RsII", yearBuilt: 1935, floors: 4, sector: 3 },
  { address: "Str. Batiștei nr. 28", lat: 44.4418, lng: 26.1053, riskClass: "RsII", yearBuilt: 1947, floors: 4, sector: 2 },
  { address: "Calea Dorobanți nr. 30", lat: 44.4512, lng: 26.0956, riskClass: "RsII", yearBuilt: 1952, floors: 5, sector: 1 },
  { address: "Str. Matei Millo nr. 9", lat: 44.4364, lng: 26.0946, riskClass: "RsII", yearBuilt: 1940, floors: 4, sector: 1 },

  // ====== RsIII (risc moderat) ======
  { address: "Bd. Pache Protopopescu nr. 66", lat: 44.4381, lng: 26.1142, riskClass: "RsIII", yearBuilt: 1958, floors: 5, sector: 2 },
  { address: "Str. Traian nr. 187", lat: 44.4319, lng: 26.1168, riskClass: "RsIII", yearBuilt: 1960, floors: 4, sector: 2 },
  { address: "Str. Decebal nr. 14", lat: 44.4301, lng: 26.1119, riskClass: "RsIII", yearBuilt: 1962, floors: 4, sector: 3 },
  { address: "Calea Călărașilor nr. 80", lat: 44.4325, lng: 26.1084, riskClass: "RsIII", yearBuilt: 1955, floors: 5, sector: 3 },
  { address: "Bd. Ferdinand I nr. 45", lat: 44.4373, lng: 26.1175, riskClass: "RsIII", yearBuilt: 1957, floors: 4, sector: 2 },
  { address: "Str. Halelor nr. 3", lat: 44.4309, lng: 26.0987, riskClass: "RsIII", yearBuilt: 1955, floors: 3, sector: 3 },
  { address: "Str. Lipscani nr. 63", lat: 44.4315, lng: 26.0985, riskClass: "RsIII", yearBuilt: 1952, floors: 3, sector: 3 },
  { address: "Bd. Hristo Botev nr. 7", lat: 44.4364, lng: 26.1088, riskClass: "RsIII", yearBuilt: 1950, floors: 5, sector: 3 },
  { address: "Str. Doctor Staicovici nr. 21", lat: 44.4318, lng: 26.0621, riskClass: "RsIII", yearBuilt: 1963, floors: 4, sector: 5 },
  { address: "Str. Vasile Conta nr. 16", lat: 44.4397, lng: 26.1101, riskClass: "RsIII", yearBuilt: 1948, floors: 5, sector: 2 },

  // ====== RsIV (susceptibilitate redusa) ======
  { address: "Str. Mircea Vulcănescu nr. 125", lat: 44.4496, lng: 26.0789, riskClass: "RsIV", yearBuilt: 1965, floors: 4, sector: 1 },
  { address: "Str. Mihail Eminescu nr. 89", lat: 44.4448, lng: 26.1088, riskClass: "RsIV", yearBuilt: 1968, floors: 4, sector: 2 },
  { address: "Str. General Berthelot nr. 28-30", lat: 44.4449, lng: 26.0854, riskClass: "RsIV", yearBuilt: 1970, floors: 4, sector: 1 },
  { address: "Calea Griviței nr. 200", lat: 44.4527, lng: 26.0745, riskClass: "RsIV", yearBuilt: 1972, floors: 8, sector: 1 },
  { address: "Bd. Dinicu Golescu nr. 38", lat: 44.4477, lng: 26.0705, riskClass: "RsIV", yearBuilt: 1975, floors: 8, sector: 1 },
  { address: "Str. Turda nr. 80", lat: 44.4554, lng: 26.0833, riskClass: "RsIV", yearBuilt: 1968, floors: 4, sector: 1 },
  { address: "Str. Doctor Felix nr. 45", lat: 44.4499, lng: 26.0768, riskClass: "RsIV", yearBuilt: 1965, floors: 4, sector: 1 },
  { address: "Bd. Ion Mihalache nr. 125-127", lat: 44.4588, lng: 26.0701, riskClass: "RsIV", yearBuilt: 1970, floors: 10, sector: 1 },
];

async function main() {
  console.log(`Seeding SeismicBuilding: ${BUILDINGS.length} entries...`);

  let created = 0;
  let updated = 0;

  for (const b of BUILDINGS) {
    const norm = normalizeAddress(b.address);
    const parsed = parseAddress(b.address);

    const result = await prisma.seismicBuilding.upsert({
      where: {
        addressNorm_riskClass: {
          addressNorm: norm,
          riskClass: b.riskClass,
        },
      },
      update: {
        addressRaw: b.address,
        streetName: parsed.streetName,
        streetNumber: parsed.number,
        bloc: parsed.bloc ?? b.address.match(/\bbl\.?\s*([a-z0-9]+)/i)?.[1]?.toUpperCase() ?? null,
        scara: parsed.scara,
        sector: b.sector ?? parsed.sector,
        lat: b.lat ?? null,
        lng: b.lng ?? null,
        yearBuilt: b.yearBuilt ?? null,
        floors: b.floors ?? null,
        apartments: b.apartments ?? null,
        intervention: b.intervention ?? null,
        source: "AMCCRS",
        sourceUrl: b.sourceUrl ?? "https://amccrs-pmb.ro/liste-imobile",
      },
      create: {
        addressRaw: b.address,
        addressNorm: norm,
        streetName: parsed.streetName,
        streetNumber: parsed.number,
        bloc: parsed.bloc ?? b.address.match(/\bbl\.?\s*([a-z0-9]+)/i)?.[1]?.toUpperCase() ?? null,
        scara: parsed.scara,
        sector: b.sector ?? parsed.sector,
        lat: b.lat ?? null,
        lng: b.lng ?? null,
        riskClass: b.riskClass,
        yearBuilt: b.yearBuilt ?? null,
        floors: b.floors ?? null,
        apartments: b.apartments ?? null,
        intervention: b.intervention ?? null,
        source: "AMCCRS",
        sourceUrl: b.sourceUrl ?? "https://amccrs-pmb.ro/liste-imobile",
      },
    });

    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Done: ${created} created, ${updated} updated.`);
  console.log(`Total in DB: ${await prisma.seismicBuilding.count()}`);

  const byClass = await prisma.$queryRaw<{ riskClass: string; _count: number }[]>`
    SELECT "riskClass", COUNT(*)::int as "_count" FROM "SeismicBuilding" GROUP BY "riskClass" ORDER BY "riskClass"
  `;
  console.log("By risk class:", byClass);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
