import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import ReportPdf from "@/components/pdf/ReportPdf";
import { loadPdfReportData } from "@/lib/pdf/map-report";

function bool(q: URLSearchParams, key: string, def = true) {
  const v = q.get(key);
  if (v == null) return def;
  return v === "1" || v === "true";
}

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const data = await loadPdfReportData(params.id);
  if (!data) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const url = new URL(req.url);
  const q = url.searchParams;

  const brand = {
    name: q.get("brand") ?? process.env.PDF_BRAND_NAME ?? "ImobIntel",
    color: q.get("color") ?? process.env.PDF_BRAND_COLOR ?? "#6A7DFF",
    logoUrl: q.get("logo") ?? process.env.PDF_BRAND_LOGO_URL ?? undefined,
  };

  const sections = {
    overview: bool(q, "overview", true),
    avm: bool(q, "avm", true),
    tts: bool(q, "tts", true),
    yield: bool(q, "yield", true),
    risk: bool(q, "risk", true),
    gallery: bool(q, "gallery", true),
  };

  const pdf = <ReportPdf data={data} brand={brand} sections={sections} />;
  const stream = await renderToStream(pdf);

  // renderToStream returns an async iterable/stream-like value; NextResponse accepts a Readable stream.
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${params.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
