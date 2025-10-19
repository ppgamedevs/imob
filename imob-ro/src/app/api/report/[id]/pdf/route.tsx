// react-pdf imports
import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";

import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { ReportDoc } from "../../../../../lib/pdf/reportDoc";

async function loadAnalysis(id: string) {
  return prisma.analysis.findUnique({
    where: { id },
    include: { extractedListing: true, featureSnapshot: true },
  });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    // enforce paywall: require signin and limit 3 free reports/month per user unless proTier
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const userId = session.user.id;
    // compute month key
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // fetch user record to check proTier (may need prisma generate locally to have typed field)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const userRaw = user as unknown as Record<string, unknown> | null;
    const isPro = !!(
      userRaw &&
      typeof userRaw["proTier"] === "boolean" &&
      userRaw["proTier"] === true
    );

    if (!isPro) {
      // check usage via a local reference to avoid TS missing-property errors on PrismaClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reportUsage = (prisma as any).reportUsage as any;
      const usage = await reportUsage
        .findFirst({ where: { userId, month: monthKey } })
        .catch(() => null);

      const used = usage?.count ?? 0;
      if (used >= 3) {
        return NextResponse.json({ error: "quota_exceeded" }, { status: 402 });
      }

      // increment usage (create or update)
      if (usage) {
        await reportUsage.update({ where: { id: usage.id }, data: { count: used + 1 } });
      } else {
        await reportUsage.create({ data: { userId, month: monthKey, count: 1 } });
      }
    }

    const analysis = await loadAnalysis(id);
    if (!analysis) return NextResponse.json({ error: "not found" }, { status: 404 });

    const extracted = analysis.extractedListing ?? null;
    const f: Record<string, unknown> =
      (analysis.featureSnapshot?.features as Record<string, unknown>) ?? {};

    // Minimal typed view over featureSnapshot to avoid `any` and allow property access
    type FeatureSnapshotView = {
      avm?: unknown;
      ttsBucket?: string | null;
      yieldNet?: number | null;
      riskSeismic?: number | null;
      conditionScore?: number | null;
      comps?: Array<Record<string, unknown>> | null;
      features?: Record<string, unknown> | null;
    };

    const fsnap = (analysis.featureSnapshot as FeatureSnapshotView) ?? ({} as FeatureSnapshotView);
    const avm = fsnap.avm ?? null;
    const ttsBucket = fsnap.ttsBucket ?? null;
    const yieldNet = fsnap.yieldNet ?? null;
    const riskSeismic = fsnap.riskSeismic ?? null;

    const conditionScore = fsnap.conditionScore ?? null;

    // read branding params from query string
    const url = new URL(req.url);
    const agencyLogo = url.searchParams.get("agencyLogo");
    const brandColor = url.searchParams.get("brandColor");
    const savePreset = url.searchParams.get("savePreset") === "true";

    const docData = {
      address: extracted?.addressRaw ?? null,
      price: extracted?.price ?? null,
      avm: avm ?? null,
      tts: ttsBucket ?? null,
      yieldNet: yieldNet ?? null,
      riskSeismic: riskSeismic ?? null,
      conditionScore: conditionScore ?? null,
      comps: (f.comps as Array<Record<string, unknown>>) ?? null,
      photos: Array.isArray(extracted?.photos) ? (extracted?.photos as string[]) : null,
      agencyLogo: agencyLogo ?? null,
      brandColor: brandColor ?? null,
    };

    const MyDoc = <ReportDoc data={docData} />;

    // persist preset on user's record when requested and user role is agency
    try {
      if (savePreset && session?.user) {
        const u = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (u && u.role === "agency") {
          // prisma client types may be out-of-date until you run prisma generate after migrating
          // use any cast here to avoid build-time type errors
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).user.update({
            where: { id: session.user.id },
            data: { agencyLogo: agencyLogo ?? null, brandColor: brandColor ?? null },
          });
        }
      }
    } catch (err) {
      console.warn("failed to save agency preset", err);
    }

    // Render to buffer via stream
    const stream = await renderToStream(MyDoc);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${id}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
