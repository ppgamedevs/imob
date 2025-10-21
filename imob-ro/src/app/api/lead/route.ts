import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

async function notifyOwner(
  analysisId: string,
  payload: { name: string; email: string; phone?: string; message?: string },
) {
  try {
    // Find the analysis owner
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { user: true },
    });

    const ownerEmail = analysis?.user?.email;
    if (!ownerEmail) {
      console.warn("No owner email found for analysis", analysisId);
      return;
    }

    // Compose email
    const subject = "Lead nou pe raportul tău imobiliar";
    const html = `
      <h2>Ai primit un lead nou!</h2>
      <p>Cineva este interesăt de proprietatea ta analizată.</p>
      
      <h3>Detalii contact:</h3>
      <ul>
        <li><strong>Nume:</strong> ${payload.name}</li>
        <li><strong>Email:</strong> ${payload.email}</li>
        <li><strong>Telefon:</strong> ${payload.phone || "—"}</li>
      </ul>
      
      ${payload.message ? `<h3>Mesaj:</h3><p>${payload.message}</p>` : ""}
      
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Acest email a fost generat automat de platforma ${process.env.PDF_BRAND_NAME || "ImobIntel"}.
      </p>
    `;

    await sendEmail(ownerEmail, subject, html);
  } catch (error) {
    console.error("Failed to notify owner:", error);
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { analysisId, name, email, phone, message } = json || {};

    // Validation
    if (!analysisId || !name || !email) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Log contact request to ReportUsage
    await prisma.reportUsage.create({
      data: {
        userId: "", // anonymous/public
        analysisId,
        action: "CONTACT_REQUEST",
        meta: { name, email, phone: phone || "" },
      },
    });

    // Send notification email to owner
    await notifyOwner(analysisId, { name, email, phone, message });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Lead API error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
