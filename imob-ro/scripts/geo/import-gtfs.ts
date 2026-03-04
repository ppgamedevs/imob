/**
 * Import transport stops from a GTFS feed into GeoTransportStop.
 *
 * Usage:
 *   GTFS_FILE=./data/gtfs-bucharest.zip pnpm tsx scripts/geo/import-gtfs.ts
 *
 * Or provide a URL:
 *   GTFS_URL=https://example.com/gtfs.zip pnpm tsx scripts/geo/import-gtfs.ts
 *
 * GTFS spec: https://gtfs.org/schedule/reference/
 * Expected files inside the zip: stops.txt, routes.txt, trips.txt, stop_times.txt
 *
 * Environment:
 *   GTFS_FILE       — Path to local GTFS zip
 *   GTFS_URL        — URL to download GTFS zip (GTFS_FILE takes precedence)
 *   DATABASE_URL    — Required: Prisma connection string
 */
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { tmpdir } from "os";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TransportMode = "METRO" | "TRAM" | "BUS" | "TROLLEY";

interface RawStop {
  stopId: string;
  name: string;
  lat: number;
  lng: number;
}

interface RawRoute {
  routeId: string;
  routeType: number;
  routeShortName?: string;
  agencyId?: string;
}

// GTFS route_type -> our TransportMode
// https://gtfs.org/schedule/reference/#routestxt
function routeTypeToMode(routeType: number): TransportMode {
  switch (routeType) {
    case 1:  // Subway / Metro
    case 401: // Metro
    case 402: // Underground
      return "METRO";
    case 0:  // Tram / Streetcar
    case 900: // Tram
      return "TRAM";
    case 3:   // Bus
    case 700:
    case 702: // Express Bus
    case 704: // Local Bus
      return "BUS";
    case 11:  // Trolleybus
    case 800:
      return "TROLLEY";
    default:
      return "BUS"; // fallback
  }
}

// ---- CSV parsing (minimal, handles quoted fields) ----

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Strip BOM
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const headers = parseCSVLine(headerLine);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = vals[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

// ---- ZIP extraction ----

async function extractZip(zipPath: string): Promise<Record<string, string>> {
  // Dynamic import of 'unzipper' or fallback to 'adm-zip'
  const files: Record<string, string> = {};

  try {
    // Try adm-zip first (common in Node projects)
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(zipPath);
    for (const entry of zip.getEntries()) {
      const name = entry.entryName.split("/").pop() ?? entry.entryName;
      if (name.endsWith(".txt")) {
        files[name] = entry.getData().toString("utf-8");
      }
    }
    return files;
  } catch {
    // Fallback: manual extraction using Node's built-in zlib
    console.log("adm-zip not available, trying manual extraction...");
    // Use child_process to unzip
    const { execSync } = await import("child_process");
    const tmpDir = path.join(tmpdir(), `gtfs-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
      execSync(`tar -xf "${zipPath}" -C "${tmpDir}"`, { stdio: "pipe" });
    } catch {
      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: "pipe" });
    }
    const entries = fs.readdirSync(tmpDir, { recursive: true }) as string[];
    for (const entry of entries) {
      const full = path.join(tmpDir, entry);
      if (fs.statSync(full).isFile() && entry.endsWith(".txt")) {
        const name = path.basename(entry);
        files[name] = fs.readFileSync(full, "utf-8");
      }
    }
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return files;
  }
}

// ---- Download ----

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`Downloading: ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const ws = createWriteStream(dest);
  // @ts-expect-error — Node fetch body to stream pipe
  await pipeline(res.body, ws);
}

// ---- Main ----

async function main() {
  console.log("=== GTFS Transport Stop Importer ===\n");

  let zipPath = process.env.GTFS_FILE ?? "";

  if (!zipPath && process.env.GTFS_URL) {
    const tmpPath = path.join(tmpdir(), `gtfs-download-${Date.now()}.zip`);
    await downloadFile(process.env.GTFS_URL, tmpPath);
    zipPath = tmpPath;
  }

  if (!zipPath) {
    console.error(
      "Provide either GTFS_FILE=path/to/gtfs.zip or GTFS_URL=https://...\n" +
        "Bucharest GTFS: https://data.gov.ro or STB's open data portal",
    );
    process.exit(1);
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`File not found: ${zipPath}`);
    process.exit(1);
  }

  console.log(`Extracting: ${zipPath}`);
  const files = await extractZip(zipPath);
  console.log(`Found files: ${Object.keys(files).join(", ")}\n`);

  // ---- Parse stops.txt ----
  if (!files["stops.txt"]) {
    console.error("stops.txt not found in GTFS archive");
    process.exit(1);
  }

  const stopsRaw = parseCSV(files["stops.txt"]);
  console.log(`Parsed ${stopsRaw.length} stops from stops.txt`);

  const stops: RawStop[] = stopsRaw
    .map((r) => ({
      stopId: r.stop_id ?? "",
      name: r.stop_name ?? "",
      lat: parseFloat(r.stop_lat ?? ""),
      lng: parseFloat(r.stop_lon ?? ""),
    }))
    .filter((s) => s.stopId && s.name && !isNaN(s.lat) && !isNaN(s.lng));

  console.log(`Valid stops: ${stops.length}`);

  // ---- Parse routes.txt to determine mode ----
  const routeMap = new Map<string, TransportMode>();
  if (files["routes.txt"]) {
    const routesRaw = parseCSV(files["routes.txt"]);
    console.log(`Parsed ${routesRaw.length} routes from routes.txt`);
    for (const r of routesRaw) {
      const routeId = r.route_id ?? "";
      const routeType = parseInt(r.route_type ?? "3", 10);
      if (routeId) {
        routeMap.set(routeId, routeTypeToMode(routeType));
      }
    }
  }

  // ---- Build stop → mode mapping via trips.txt + stop_times.txt ----
  const stopModeMap = new Map<string, Set<TransportMode>>();

  if (files["trips.txt"] && files["stop_times.txt"] && routeMap.size > 0) {
    // trips.txt: route_id → trip_id
    const tripToRoute = new Map<string, string>();
    const tripsRaw = parseCSV(files["trips.txt"]);
    for (const t of tripsRaw) {
      if (t.trip_id && t.route_id) tripToRoute.set(t.trip_id, t.route_id);
    }
    console.log(`Parsed ${tripsRaw.length} trips`);

    // stop_times.txt: trip_id → stop_id
    const stRaw = parseCSV(files["stop_times.txt"]);
    console.log(`Parsed ${stRaw.length} stop_times`);
    for (const st of stRaw) {
      const tripId = st.trip_id;
      const stopId = st.stop_id;
      if (!tripId || !stopId) continue;
      const routeId = tripToRoute.get(tripId);
      if (!routeId) continue;
      const mode = routeMap.get(routeId);
      if (!mode) continue;
      if (!stopModeMap.has(stopId)) stopModeMap.set(stopId, new Set());
      stopModeMap.get(stopId)!.add(mode);
    }
    console.log(`Mapped modes for ${stopModeMap.size} stops\n`);
  } else {
    console.log("No trips/stop_times or routes — defaulting all stops to BUS\n");
  }

  // ---- Upsert stops ----
  let created = 0;
  let updated = 0;
  let errors = 0;

  // If a stop serves multiple modes, create one entry per mode
  const entries: { stop: RawStop; mode: TransportMode }[] = [];
  for (const stop of stops) {
    const modes = stopModeMap.get(stop.stopId);
    if (modes && modes.size > 0) {
      for (const mode of modes) {
        entries.push({ stop, mode });
      }
    } else {
      entries.push({ stop, mode: "BUS" });
    }
  }

  console.log(`Total entries to upsert: ${entries.length}`);

  for (let i = 0; i < entries.length; i++) {
    const { stop, mode } = entries[i];
    const uniqueStopId = `${stop.stopId}:${mode}`;

    try {
      const result = await prisma.geoTransportStop.upsert({
        where: { stopId: uniqueStopId },
        update: {
          lat: stop.lat,
          lng: stop.lng,
          name: stop.name,
          mode,
          source: "GTFS",
        },
        create: {
          stopId: uniqueStopId,
          lat: stop.lat,
          lng: stop.lng,
          name: stop.name,
          mode,
          source: "GTFS",
        },
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) created++;
      else updated++;
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`  Error for "${stop.name}":`, (err as Error).message);
    }

    if ((i + 1) % 500 === 0 || i === entries.length - 1) {
      console.log(`  Progress: ${i + 1}/${entries.length} (created: ${created}, updated: ${updated}, errors: ${errors})`);
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);

  const total = await prisma.geoTransportStop.count();
  console.log(`Total in DB: ${total}`);

  const byMode = await prisma.geoTransportStop.groupBy({
    by: ["mode"],
    _count: { id: true },
    orderBy: { mode: "asc" },
  });
  console.log("By mode:", byMode.map((r) => `${r.mode}: ${r._count.id}`).join(", "));
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
