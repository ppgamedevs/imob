import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const el = await prisma.extractedListing.findUnique({
    where: { analysisId: id },
    select: { llmEnrichedAt: true },
  });

  if (!el) {
    return NextResponse.json({ done: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ done: !!el.llmEnrichedAt });
}
