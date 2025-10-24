/**
 * OwnerLead JSON Export API
 *
 * Exports complete owner lead data in JSON format for data portability.
 * Includes lead details, events, and all calculations.
 *
 * Usage: GET /api/owner/[id]/export
 * Auth: None (public data, lead ID acts as access token)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/obs/logger";

const logger = createLogger({ name: "owner-export" });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch lead with all events
    const lead = await prisma.ownerLead.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { ts: "asc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    logger.info({ leadId: id, eventsCount: lead.events.length }, "Exporting owner lead");

    // Track export event
    await prisma.ownerLeadEvent.create({
      data: {
        leadId: lead.id,
        kind: "export",
        meta: {
          format: "json",
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Build export data
    const exportData = {
      // Metadata
      _export: {
        id: lead.id,
        exportedAt: new Date().toISOString(),
        version: "1.0",
      },

      // Lead information
      lead: {
        id: lead.id,
        email: lead.email,
        phone: lead.phone,
        userId: lead.userId,
        status: lead.status,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      },

      // Property details
      property: {
        city: lead.city,
        area: lead.areaSlug,
        addressHint: lead.addressHint,
        location:
          lead.lat && lead.lng
            ? {
                lat: lead.lat,
                lng: lead.lng,
              }
            : null,
        rooms: lead.rooms,
        areaM2: lead.areaM2,
        yearBuilt: lead.yearBuilt,
        conditionScore: lead.conditionScore,
        notes: lead.notes,
      },

      // Calculations
      calculations: {
        valuation: lead.avmMid
          ? {
              low: lead.avmLow,
              mid: lead.avmMid,
              high: lead.avmHigh,
              suggested: lead.priceSuggested,
            }
          : null,
        timeToSell: lead.ttsBucket,
        rental:
          lead.estRent && lead.yieldNet
            ? {
                estimatedRent: lead.estRent,
                yieldNet: lead.yieldNet,
                yieldNetPercent: (lead.yieldNet * 100).toFixed(2) + "%",
              }
            : null,
      },

      // Events timeline
      events: lead.events.map((event) => ({
        id: event.id,
        type: event.kind,
        timestamp: event.ts.toISOString(),
        metadata: event.meta,
      })),

      // Summary statistics
      summary: {
        totalEvents: lead.events.length,
        eventTypes: lead.events.reduce(
          (acc, e) => {
            acc[e.kind] = (acc[e.kind] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        firstEvent: lead.events[0]?.ts.toISOString(),
        lastEvent: lead.events[lead.events.length - 1]?.ts.toISOString(),
      },
    };

    // Return JSON with proper headers
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="owner-lead-${id}-${Date.now()}.json"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    logger.error({ error }, "Owner lead export failed");

    return NextResponse.json({ error: "Failed to export lead data" }, { status: 500 });
  }
}
