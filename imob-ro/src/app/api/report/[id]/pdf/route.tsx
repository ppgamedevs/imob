// react-pdf imports
import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";

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
    const analysis = await loadAnalysis(id);
    if (!analysis) return NextResponse.json({ error: "not found" }, { status: 404 });

    const extracted = analysis.extractedListing ?? null;
    const f: Record<string, unknown> =
      (analysis.featureSnapshot?.features as Record<string, unknown>) ?? {};

  const fsnap = analysis?.featureSnapshot as any;
  const avm = fsnap?.avm ?? null;
  const ttsBucket = fsnap?.ttsBucket ?? null;
  const yieldNet = fsnap?.yieldNet ?? null;
  const riskSeismic = fsnap?.riskSeismic ?? null;

  const conditionScore = fsnap?.conditionScore ?? null;

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
    };

    const MyDoc = <ReportDoc data={docData} />;

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
