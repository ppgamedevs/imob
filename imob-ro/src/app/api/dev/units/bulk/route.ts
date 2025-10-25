// Step 11: Bulk units API endpoint
// POST /api/dev/units/bulk
// Auth: ?devId=xxx&token=xxx or body { devId, token }
// Accepts CSV or JSON array of units
// Upserts by (developmentId, label), enqueues enrichment

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { enrichUnit } from "@/lib/dev/enrich";
import type { BulkUnitInput, BulkUnitsResponse } from "@/types/development";

export const runtime = "nodejs";

interface BulkRequest {
  devId: string;
  developmentId: string;
  token: string;
  format?: "csv" | "json";
  units?: BulkUnitInput[];
  csv?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse request (JSON or CSV)
    const contentType = req.headers.get("content-type");
    let body: BulkRequest;

    if (contentType?.includes("text/csv")) {
      // CSV upload
      const csvText = await req.text();
      const searchParams = req.nextUrl.searchParams;
      body = {
        devId: searchParams.get("devId") || "",
        developmentId: searchParams.get("developmentId") || "",
        token: searchParams.get("token") || "",
        format: "csv",
        csv: csvText,
      };
    } else {
      // JSON
      body = await req.json();
    }

    const { devId, developmentId, token, format, units: jsonUnits, csv } = body;

    // 2. Validate auth
    if (!devId || !token) {
      return NextResponse.json({ ok: false, error: "Missing devId or token" }, { status: 400 });
    }

    const developer = await prisma.developer.findUnique({
      where: { id: devId },
      select: { apiToken: true },
    });

    if (!developer || developer.apiToken !== token) {
      return NextResponse.json({ ok: false, error: "Invalid authentication" }, { status: 401 });
    }

    // 3. Validate development exists
    const development = await prisma.development.findUnique({
      where: { id: developmentId },
      select: { id: true, developerId: true },
    });

    if (!development) {
      return NextResponse.json({ ok: false, error: "Development not found" }, { status: 404 });
    }

    // Optional: check developer owns this development
    if (development.developerId && development.developerId !== devId) {
      return NextResponse.json(
        { ok: false, error: "Development not owned by this developer" },
        { status: 403 },
      );
    }

    // 4. Parse units
    let parsedUnits: BulkUnitInput[] = [];
    const errors: string[] = [];

    if (format === "csv" && csv) {
      parsedUnits = parseCSV(csv, errors);
    } else if (jsonUnits) {
      parsedUnits = jsonUnits;
    } else {
      return NextResponse.json({ ok: false, error: "No units data provided" }, { status: 400 });
    }

    if (parsedUnits.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid units to process", errors },
        { status: 400 },
      );
    }

    // 5. Upsert units
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const unitInput of parsedUnits) {
      try {
        // Validate required fields
        if (!unitInput.label || !unitInput.typology || !unitInput.areaM2 || !unitInput.priceEur) {
          errors.push(`Skipping unit ${unitInput.label || "unknown"}: missing required fields`);
          skipped++;
          continue;
        }

        // Check if unit exists
        const existing = await prisma.unit.findFirst({
          where: {
            developmentId,
            label: unitInput.label,
          },
        });

        const unitData = {
          label: unitInput.label,
          typology: unitInput.typology,
          areaM2: unitInput.areaM2,
          priceEur: unitInput.priceEur,
          floor: unitInput.floor || null,
          rooms: unitInput.rooms || null,
          orientation: unitInput.orientation || null,
          parkingAvail: unitInput.parkingAvail || null,
          stage: unitInput.stage || "in_sales",
          photos: unitInput.photos ? (unitInput.photos as any) : null,
        };

        let unitId: string;

        if (existing) {
          // Update
          await prisma.unit.update({
            where: { id: existing.id },
            data: unitData,
          });
          unitId = existing.id;
          updated++;
        } else {
          // Create
          const newUnit = await prisma.unit.create({
            data: {
              ...unitData,
              developmentId,
            },
          });
          unitId = newUnit.id;
          created++;
        }

        // 6. Enqueue enrichment (fire and forget)
        enrichUnit(unitId).catch((err) => {
          console.error(`[bulk] Failed to enrich unit ${unitId}:`, err);
        });
      } catch (err) {
        const error = err as Error;
        errors.push(`Failed to process unit ${unitInput.label}: ${error.message}`);
        skipped++;
      }
    }

    const response: BulkUnitsResponse = {
      ok: true,
      created,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[bulk] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

// ========================================
// CSV Parser
// ========================================

function parseCSV(csv: string, errors: string[]): BulkUnitInput[] {
  const units: BulkUnitInput[] = [];
  const lines = csv.trim().split("\n");

  if (lines.length < 2) {
    errors.push("CSV must have at least header + 1 data row");
    return units;
  }

  // Parse header
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredHeaders = ["label", "typology", "aream2", "priceeur"];

  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      errors.push(`Missing required CSV header: ${req}`);
      return units;
    }
  }

  // Map header indices
  const getIndex = (name: string) => headers.indexOf(name);

  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: column count mismatch`);
      continue;
    }

    try {
      const unit: BulkUnitInput = {
        label: values[getIndex("label")] || "",
        typology: values[getIndex("typology")] || "",
        areaM2: parseFloat(values[getIndex("aream2")] || "0"),
        priceEur: parseInt(values[getIndex("priceeur")] || "0", 10),
        floor: values[getIndex("floor")] || undefined,
        rooms: getIndex("rooms") >= 0 ? parseFloat(values[getIndex("rooms")]) : undefined,
        orientation: values[getIndex("orientation")] || undefined,
        parkingAvail:
          getIndex("parkingavail") >= 0
            ? values[getIndex("parkingavail")].toLowerCase() === "true"
            : undefined,
        stage: values[getIndex("stage")] || undefined,
        photos:
          getIndex("photos") >= 0
            ? values[getIndex("photos")].split("|").filter(Boolean)
            : undefined,
      };

      units.push(unit);
    } catch (err) {
      errors.push(`Row ${i + 1}: parsing error`);
    }
  }

  return units;
}

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
