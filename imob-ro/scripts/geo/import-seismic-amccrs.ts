/**
 * AMCCRS seismic building importer.
 *
 * Fetches the official AMCCRS list (HTML table) from the configured URL,
 * parses building entries, normalizes addresses, geocodes where possible,
 * and upserts into the SeismicBuilding table.
 *
 * Usage:
 *   AMCCRS_URL=https://amccrs-pmb.ro/liste-imobile pnpm tsx scripts/geo/import-seismic-amccrs.ts
 *
 * Alternatively supply a local HTML file:
 *   AMCCRS_FILE=./data/amccrs-list.html pnpm tsx scripts/geo/import-seismic-amccrs.ts
 *
 * Environment:
 *   AMCCRS_URL      — URL to fetch the HTML list from (default: https://amccrs-pmb.ro/liste-imobile)
 *   AMCCRS_FILE     — Path to local HTML file (takes precedence over URL)
 *   MAPBOX_TOKEN    — Optional: enables geocoding for entries without coordinates
 *   DATABASE_URL    — Required: Prisma connection string
 */
import fs from "fs";
import path from "path";

import * as cheerio from "cheerio";
import { PrismaClient } from "@prisma/client";

import { normalizeAddress, parseAddress } from "../../src/lib/risk/address-normalize";

const prisma = new PrismaClient();

const DEFAULT_AMCCRS_URL = "https://amccrs-pmb.ro/liste-imobile";
const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

// ---- Types ----

interface RawEntry {
  address: string;
  riskClass: string;
  yearBuilt?: number;
  floors?: number;
  apartments?: number;
  sector?: number;
  intervention?: string;
  externalId?: string;
}

interface GeoResult {
  lat: number;
  lng: number;
}

// ---- Risk class normalization ----

function normalizeRiskClass(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (/^(RS\s*I|RSI|CLASA?\s*I)$/i.test(s) || s === "RSI" || s === "I") return "RsI";
  if (/^(RS\s*II|RSII|CLASA?\s*II)$/i.test(s) || s === "RSII" || s === "II") return "RsII";
  if (/^(RS\s*III|RSIII|CLASA?\s*III)$/i.test(s) || s === "RSIII" || s === "III") return "RsIII";
  if (/^(RS\s*IV|RSIV|CLASA?\s*IV)$/i.test(s) || s === "RSIV" || s === "IV") return "RsIV";
  return null;
}

// ---- HTML parsing strategies ----

function parseHtmlTable(html: string): RawEntry[] {
  const $ = cheerio.load(html);
  const entries: RawEntry[] = [];

  // Strategy 1: look for <table> elements with typical AMCCRS columns
  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    if (rows.length < 2) return;

    // Detect column indices from header row
    const headerCells = $(rows[0]).find("th, td");
    const colMap: Record<string, number> = {};
    headerCells.each((i, cell) => {
      const text = $(cell).text().trim().toLowerCase();
      if (text.includes("adres")) colMap.address = i;
      else if (text.includes("clas") || text.includes("risc") || text.includes("rs")) colMap.riskClass = i;
      else if (text.includes("an") && (text.includes("constr") || text.includes("built"))) colMap.yearBuilt = i;
      else if (text.includes("etaj") || text.includes("nivel") || text.includes("floor")) colMap.floors = i;
      else if (text.includes("apart") || text.includes("locuint")) colMap.apartments = i;
      else if (text.includes("sector")) colMap.sector = i;
      else if (text.includes("nr") && text.includes("crt")) colMap.id = i;
      else if (text.includes("intervent") || text.includes("consoli") || text.includes("stare")) colMap.intervention = i;
    });

    if (!colMap.address && colMap.address !== 0) return;

    // Parse data rows
    rows.slice(1).each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length < 2) return;

      const getText = (idx: number | undefined) =>
        idx != null && idx < cells.length ? $(cells[idx]).text().trim() : "";

      const address = getText(colMap.address);
      if (!address || address.length < 5) return;

      const riskRaw = getText(colMap.riskClass);
      const riskClass = normalizeRiskClass(riskRaw);
      if (!riskClass) return;

      const yearRaw = getText(colMap.yearBuilt);
      const yearBuilt = yearRaw ? parseInt(yearRaw, 10) || undefined : undefined;

      const floorsRaw = getText(colMap.floors);
      const floors = floorsRaw ? parseInt(floorsRaw, 10) || undefined : undefined;

      const aptsRaw = getText(colMap.apartments);
      const apartments = aptsRaw ? parseInt(aptsRaw, 10) || undefined : undefined;

      const sectorRaw = getText(colMap.sector);
      const sector = sectorRaw ? parseInt(sectorRaw, 10) || undefined : undefined;

      const intervention = getText(colMap.intervention) || undefined;
      const externalId = getText(colMap.id) || undefined;

      entries.push({
        address,
        riskClass,
        yearBuilt,
        floors,
        apartments,
        sector,
        intervention: normalizeIntervention(intervention),
        externalId,
      });
    });
  });

  // Strategy 2: if no table found, look for structured list items
  if (entries.length === 0) {
    $("li, .imobil, .building-entry, [data-address]").each((_, el) => {
      const text = $(el).text().trim();
      const addr = $(el).attr("data-address") || extractAddressFromText(text);
      const risk = extractRiskFromText(text);
      if (addr && risk) {
        entries.push({ address: addr, riskClass: risk });
      }
    });
  }

  return entries;
}

function normalizeIntervention(raw?: string): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.includes("consolidat") && !lower.includes("neconsolidat")) return "consolidat";
  if (lower.includes("in lucru") || lower.includes("in curs") || lower.includes("lucrari")) return "in lucru";
  if (lower.includes("proiect") || lower.includes("dali")) return "proiect";
  if (lower.includes("neconsolidat") || lower.includes("nu ")) return undefined;
  return raw.length > 50 ? undefined : raw;
}

function extractAddressFromText(text: string): string | null {
  const match = text.match(
    /(?:str\.?|strada|bd\.?|bulevardul|calea|sos\.?|soseaua|al\.?|aleea|spl\.?|splaiul|int\.?|intrarea)\s+.+?(?:,|$)/i,
  );
  return match ? match[0].replace(/,$/, "").trim() : null;
}

function extractRiskFromText(text: string): string | null {
  const m = text.match(/(?:clas[aă]\s+(?:de\s+)?(?:risc\s+)?|Rs\s*)([IViv]{1,3})/i);
  if (!m) return null;
  return normalizeRiskClass(m[1]);
}

function extractSectorFromAddress(address: string): number | null {
  const m = address.match(/sector(?:ul)?\s*(\d)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ---- Geocoding ----

async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  const query = encodeURIComponent(`${address}, Bucuresti, Romania`);
  const url = `${MAPBOX_GEOCODE_URL}/${query}.json?access_token=${token}&limit=1&types=address&country=RO&language=ro`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { center?: [number, number] }[];
    };
    const feat = data.features?.[0];
    if (!feat?.center) return null;
    return { lat: feat.center[1], lng: feat.center[0] };
  } catch {
    return null;
  }
}

// ---- Main ----

async function fetchHtml(): Promise<string> {
  const filePath = process.env.AMCCRS_FILE;
  if (filePath) {
    const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    console.log(`Reading local file: ${abs}`);
    return fs.readFileSync(abs, "utf-8");
  }

  const url = process.env.AMCCRS_URL || DEFAULT_AMCCRS_URL;
  console.log(`Fetching from: ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "ImobIntel-SeismicImporter/1.0",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

async function main() {
  console.log("=== AMCCRS Seismic Building Importer ===\n");

  const html = await fetchHtml();
  console.log(`Fetched ${html.length.toLocaleString()} bytes of HTML`);

  const entries = parseHtmlTable(html);
  console.log(`Parsed ${entries.length} building entries\n`);

  if (entries.length === 0) {
    console.warn(
      "No entries parsed. The HTML structure may have changed.\n" +
        "Try providing a local file with AMCCRS_FILE=./path/to/file.html\n" +
        "or check the table structure on the AMCCRS website.",
    );
    process.exit(1);
  }

  const enableGeocode = !!process.env.MAPBOX_TOKEN;
  if (enableGeocode) console.log("Geocoding enabled (MAPBOX_TOKEN set)\n");
  else console.log("Geocoding disabled (set MAPBOX_TOKEN to enable)\n");

  let created = 0;
  let updated = 0;
  let geocoded = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const norm = normalizeAddress(entry.address);
    const parsed = parseAddress(entry.address);
    const sector = entry.sector ?? extractSectorFromAddress(entry.address) ?? parsed.sector;

    let lat: number | null = null;
    let lng: number | null = null;

    if (enableGeocode) {
      const geo = await geocodeAddress(entry.address);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        geocoded++;
      }
      // Rate limit: ~10 req/s
      if (i % 10 === 9) await new Promise((r) => setTimeout(r, 1100));
    }

    try {
      const result = await prisma.seismicBuilding.upsert({
        where: {
          addressNorm_riskClass: {
            addressNorm: norm,
            riskClass: entry.riskClass,
          },
        },
        update: {
          addressRaw: entry.address,
          externalId: entry.externalId ?? null,
          streetName: parsed.streetName,
          streetNumber: parsed.number,
          bloc: parsed.bloc,
          scara: parsed.scara,
          sector,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          yearBuilt: entry.yearBuilt ?? null,
          floors: entry.floors ?? null,
          apartments: entry.apartments ?? null,
          intervention: entry.intervention ?? null,
          source: "AMCCRS",
          sourceUrl: process.env.AMCCRS_URL || DEFAULT_AMCCRS_URL,
        },
        create: {
          addressRaw: entry.address,
          addressNorm: norm,
          externalId: entry.externalId ?? null,
          streetName: parsed.streetName,
          streetNumber: parsed.number,
          bloc: parsed.bloc,
          scara: parsed.scara,
          sector,
          lat,
          lng,
          riskClass: entry.riskClass,
          yearBuilt: entry.yearBuilt ?? null,
          floors: entry.floors ?? null,
          apartments: entry.apartments ?? null,
          intervention: entry.intervention ?? null,
          source: "AMCCRS",
          sourceUrl: process.env.AMCCRS_URL || DEFAULT_AMCCRS_URL,
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
      else updated++;
    } catch (err) {
      errors++;
      console.error(`  Error for "${entry.address}":`, (err as Error).message);
    }

    if ((i + 1) % 50 === 0 || i === entries.length - 1) {
      console.log(`  Progress: ${i + 1}/${entries.length} (created: ${created}, updated: ${updated}, errors: ${errors})`);
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Geocoded: ${geocoded}`);
  console.log(`Errors: ${errors}`);

  const total = await prisma.seismicBuilding.count();
  console.log(`Total in DB: ${total}`);

  const byClass = await prisma.$queryRaw<{ riskClass: string; count: bigint }[]>`
    SELECT "riskClass", COUNT(*) as "count"
    FROM "SeismicBuilding"
    GROUP BY "riskClass"
    ORDER BY "riskClass"
  `;
  console.log(
    "By risk class:",
    byClass.map((r) => `${r.riskClass}: ${r.count}`).join(", "),
  );
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
