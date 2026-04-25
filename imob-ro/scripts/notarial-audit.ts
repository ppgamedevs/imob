/**
 * Read-only NotarialGrid diagnostic (no writes).
 *
 *   pnpm notarial:audit
 *   pnpm exec tsx scripts/notarial-audit.ts
 */
import { config } from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

const SECTION = (title: string) => {
  console.log("");
  console.log("═".repeat(64));
  console.log(`  ${title}`);
  console.log("═".repeat(64));
};

const isGenericZone = (zone: string, neighborhood: string | null) => {
  const z = zone.trim();
  if (!neighborhood || neighborhood.trim() === "") return { generic: true, reason: "missing neighborhood" };
  if (/^(București|Bucuresti|Bucureşti)$/i.test(z)) {
    return { generic: true, reason: "zone is city name only" };
  }
  if (/^sector\s+\d+$/i.test(z)) {
    return { generic: true, reason: "zone is only Sector N" };
  }
  if (/^S\d+$/i.test(z) && !z.includes("-")) {
    return { generic: true, reason: "zone is only S# shorthand" };
  }
  return { generic: false, reason: "" };
};

function fmtNum(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

async function main() {
  console.log("NotarialGrid audit (read-only)\n");

  const total = await prisma.notarialGrid.count();
  if (total === 0) {
    console.log("NotarialGrid: 0 rows. Nothing to analyze.");
    return;
  }
  console.log(`Total NotarialGrid rows: ${total}\n`);

  SECTION("Schema note: currency & unit");
  console.log(
    "The model has minEurPerM2 / maxEurPerM2 (documented in schema as EUR/m²). " +
      "There are no separate `currency` or `unit` columns; semantics are by convention only.",
  );

  SECTION("Row count by year");
  const byYear = await prisma.notarialGrid.groupBy({
    by: ["year"],
    _count: { _all: true },
    orderBy: { year: "asc" },
  });
  for (const r of byYear) {
    console.log(`  year ${r.year}: ${r._count._all} rows`);
  }

  SECTION("Row count by propertyType");
  const byPt = await prisma.notarialGrid.groupBy({
    by: ["propertyType"],
    _count: { _all: true },
    orderBy: { propertyType: "asc" },
  });
  for (const r of byPt) {
    console.log(`  ${r.propertyType}: ${r._count._all} rows`);
  }

  SECTION("minEurPerM2 stats by propertyType + year (min / median / max)");
  const stats = await prisma.$queryRaw<
    {
      propertyType: string;
      year: number;
      n: bigint;
      min_v: number;
      p50: number;
      max_v: number;
    }[]
  >(Prisma.sql`
    SELECT
      "propertyType",
      year,
      COUNT(*)::bigint AS n,
      MIN("minEurPerM2")::float AS min_v,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "minEurPerM2"))::float AS p50,
      MAX("minEurPerM2")::float AS max_v
    FROM "NotarialGrid"
    GROUP BY "propertyType", year
    ORDER BY year ASC, "propertyType" ASC
  `);
  for (const r of stats) {
    const n = Number(r.n);
    console.log(
      `  [${r.year} | ${r.propertyType}]  n=${n}  min=${fmtNum(r.min_v)}  p50=${fmtNum(r.p50)}  max=${fmtNum(
        r.max_v,
      )}`,
    );
  }

  SECTION("maxEurPerM2 (where set) min / p50 / max, by propertyType + year");
  const maxStats = await prisma.$queryRaw<
    { propertyType: string; year: number; n: bigint; min_v: number; p50: number; max_v: number }[]
  >(Prisma.sql`
    SELECT
      "propertyType",
      year,
      COUNT(*)::bigint AS n,
      MIN("maxEurPerM2")::float AS min_v,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "maxEurPerM2"))::float AS p50,
      MAX("maxEurPerM2")::float AS max_v
    FROM "NotarialGrid"
    WHERE "maxEurPerM2" IS NOT NULL
    GROUP BY "propertyType", year
    ORDER BY year ASC, "propertyType" ASC
  `);
  if (maxStats.length === 0) {
    console.log("  (no rows with maxEurPerM2 set)");
  } else {
    for (const r of maxStats) {
      const n = Number(r.n);
      console.log(
        `  [${r.year} | ${r.propertyType}]  n=${n}  min=${fmtNum(r.min_v)}  p50=${fmtNum(r.p50)}  max=${fmtNum(
          r.max_v,
        )}`,
      );
    }
  }

  SECTION("Rows with missing currency / unit (DB columns)");
  console.log("  0 — NotarialGrid has no `currency` or `unit` columns; nothing to list.");

  SECTION("Apartment in București/Ilfov with minEurPerM2 < 400 (suspicious for EUR/m²)");
  const low = await prisma.$queryRaw<
    {
      id: string;
      zone: string;
      city: string;
      sector: number | null;
      neighborhood: string | null;
      year: number;
      minEurPerM2: number;
      maxEurPerM2: number | null;
      source: string | null;
    }[]
  >(Prisma.sql`
    SELECT
      id, zone, city, sector, neighborhood, year, "minEurPerM2", "maxEurPerM2", source
    FROM "NotarialGrid"
    WHERE
      "propertyType" = 'apartment'
      AND "minEurPerM2" < 400
      AND (city ILIKE '%bucure%' OR city ILIKE '%ilfov%')
    ORDER BY "minEurPerM2" ASC, year DESC
  `);
  if (low.length === 0) {
    console.log("  (none)");
  } else {
    for (const r of low) {
      console.log(
        `  min=${r.minEurPerM2}  max=${r.maxEurPerM2 ?? "—"}  y=${r.year}  ` +
          `sect=${r.sector ?? "—"}  zone="${r.zone}"  nbd="${r.neighborhood ?? "—"}"  city="${r.city}"  src=${
            r.source ?? "—"
          }`,
      );
    }
  }

  SECTION("Generic or underspecified zone / neighborhood (review manually)");
  const all = await prisma.notarialGrid.findMany({
    orderBy: [{ year: "desc" }, { zone: "asc" }],
    select: {
      year: true,
      zone: true,
      neighborhood: true,
      propertyType: true,
      minEurPerM2: true,
    },
  });
  const generic: typeof all = [];
  for (const row of all) {
    const g = isGenericZone(row.zone, row.neighborhood);
    if (g.generic) {
      generic.push({ ...row });
    }
  }
  if (generic.length === 0) {
    console.log("  (none by heuristic: city-only zone, Sector N only, S# only, or empty neighborhood)");
  } else {
    for (const r of generic) {
      const g = isGenericZone(r.zone, r.neighborhood);
      console.log(
        `  y=${r.year}  ${r.propertyType}  min=${r.minEurPerM2}  zone="${r.zone}"  nbd="${r.neighborhood ?? "—"}"  → ${
          g.reason
        }`,
      );
    }
  }

  SECTION("Data provenance: source (nullable) and possible stale years");
  const bySource = await prisma.notarialGrid.groupBy({
    by: ["source", "year"],
    _count: { _all: true },
    orderBy: [{ year: "asc" }, { source: "asc" }],
  });
  for (const r of bySource) {
    const src = r.source === null || r.source === "" ? "(null/empty source)" : r.source;
    console.log(`  year ${r.year}  ${src}  count=${r._count._all}`);
  }

  console.log("");
  console.log("Done. This script only reads; it does not modify the database.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());