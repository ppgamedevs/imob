// Step 11: Lead receiver API endpoint
// POST /api/dev/lead
// Receives lead from development project pages
// Validates token, stores DevLead, optional CRM forwarding

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { LeadRequest, LeadResponse } from "@/types/development";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body: LeadRequest = await req.json();
    const { devId, token, developmentId, unitId, name, contact, message, utm } = body;

    // 1. Validate required fields
    if (!developmentId || !contact) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: developmentId, contact" } as LeadResponse,
        { status: 400 }
      );
    }

    // 2. Verify development exists
    const development = await prisma.development.findUnique({
      where: { id: developmentId },
      select: { id: true, developerId: true },
    });

    if (!development) {
      return NextResponse.json(
        { ok: false, error: "Development not found" } as LeadResponse,
        { status: 404 }
      );
    }

    // 3. Optional: Validate developer token if provided
    if (devId && token) {
      const developer = await prisma.developer.findUnique({
        where: { id: devId },
        select: { apiToken: true },
      });

      if (!developer || developer.apiToken !== token) {
        return NextResponse.json(
          { ok: false, error: "Invalid developer authentication" } as LeadResponse,
          { status: 401 }
        );
      }

      // Optional: check developer owns this development
      if (development.developerId && development.developerId !== devId) {
        return NextResponse.json(
          { ok: false, error: "Development not owned by this developer" } as LeadResponse,
          { status: 403 }
        );
      }
    }

    // 4. Validate unit if provided
    if (unitId) {
      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        select: { developmentId: true },
      });

      if (!unit || unit.developmentId !== developmentId) {
        return NextResponse.json(
          { ok: false, error: "Unit not found or does not belong to this development" } as LeadResponse,
          { status: 404 }
        );
      }
    }

    // 5. Store lead
    const lead = await prisma.devLead.create({
      data: {
        developmentId,
        unitId: unitId || null,
        name: name || null,
        contact,
        message: message || null,
        utm: utm ? (utm as any) : null,
      },
    });

    // 6. Optional: Forward to developer CRM (if configured)
    // This could be a webhook URL stored in Developer.brand or a separate field
    if (development.developerId) {
      const developer = await prisma.developer.findUnique({
        where: { id: development.developerId },
        select: { brand: true, name: true },
      });

      if (developer?.brand) {
        const brand = developer.brand as any;
        if (brand.webhookUrl) {
          // Fire and forget - don't block response
          forwardLeadToWebhook(brand.webhookUrl, {
            leadId: lead.id,
            developmentId,
            unitId,
            name,
            contact,
            message,
            utm,
            timestamp: lead.createdAt.toISOString(),
          }).catch((err) => {
            console.error("[lead] Failed to forward to webhook:", err);
          });
        }
      }
    }

    // 7. Send confirmation email to lead (optional)
    // await sendLeadConfirmationEmail(contact, development.name);

    const response: LeadResponse = {
      ok: true,
      leadId: lead.id,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[lead] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" } as LeadResponse,
      { status: 500 }
    );
  }
}

// ========================================
// CRM Webhook Forwarding
// ========================================

async function forwardLeadToWebhook(webhookUrl: string, payload: any): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "iR-Developments/1.0",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
  }
}

// ========================================
// Email Confirmation (placeholder)
// ========================================

// async function sendLeadConfirmationEmail(contact: string, developmentName: string) {
//   // Use Resend or similar to send confirmation
//   // "Thank you for your interest in {developmentName}..."
// }
