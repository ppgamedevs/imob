import { renderToStream } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import ReportPdf from "@/components/pdf/ReportPdf";
import { auth } from "@/lib/auth";
import { canUse, incUsage } from "@/lib/billing/entitlements";
import {
  canViewFullReportFromRequest,
  getReportUnlockPriceRon,
  isPerReportUnlockPdfQuotaExempt,
} from "@/lib/billing/report-unlock";
import { loadPdfReportData } from "@/lib/pdf/map-report";

/**
 * PDF: acces = canViewFullReportFromRequest (plată per raport, Pro, abonament, cookie guest HMAC, sau `?unlock_token=` același token).
 * Cota lunară PDF (abonament) nu se consumă la deblocare per raport / guest cookie; vezi isPerReportUnlockPdfQuotaExempt.
 * Fără deblocare: 403 JSON (unlock_required). Previzualizarea nu afișează butonul PDF.
 * Nu loga `req.url` complet: conținutul query poate include `unlock_token` (bearer) — acest route doar
 * citește `unlock_token` și nu îl reafișează.
 */
function bool(q: URLSearchParams, key: string, def = true) {
  const v = q.get(key);
  if (v == null) return def;
  return v === "1" || v === "true";
}

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const cookieHeader = req.headers.get("cookie");
  const url = new URL(req.url);
  const unlockToken = url.searchParams.get("unlock_token");

  const full = await canViewFullReportFromRequest(id, userId, cookieHeader, unlockToken);
  if (!full) {
    const unlockRon = getReportUnlockPriceRon();
    const ronLabel = Number.isInteger(unlockRon) ? String(unlockRon) : unlockRon.toFixed(2);
    return NextResponse.json(
      {
        error: "unlock_required",
        code: "unlock_required",
        message:
          `Pentru PDF ai nevoie de raportul complet deblocat: plată ${ronLabel} RON per raport, abonament care include conținutul, sau cont Pro. ` +
          "Dacă ai plătit deja, folosește același browser (cookie) sau conectează-te la contul cu care s-a făcut plata. " +
          "Autentificarea nu e obligatorie dacă ai cookie-ul de deblocare după checkout.",
      },
      { status: 403 },
    );
  }

  // PDF quota: one-time per-report unlock does not consume the monthly PDF counter; subscriptions still do.
  const fromPerReport = await isPerReportUnlockPdfQuotaExempt(id, userId, cookieHeader, unlockToken);
  if (userId && !fromPerReport) {
    const check = await canUse(userId, "pdf");
    if (!check.allowed) {
      const unlockRon = getReportUnlockPriceRon();
      const ronLabel = Number.isInteger(unlockRon) ? String(unlockRon) : unlockRon.toFixed(2);
      return NextResponse.json(
        {
          error: "limit_reached",
          plan: check.plan,
          used: check.used,
          max: check.max,
          message: `Limita de PDF-uri: ${check.used}/${check.max} pe luna. Deblocarea ${ronLabel} RON per raport (sau cookie de plată pentru acel anunț) nu consumă acest contor; cota se aplică la abonamentul lunar.`,
        },
        { status: 402 },
      );
    }
  }

  // Load data for PDF generation
  const data = await loadPdfReportData(id);
  if (!data) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const q = url.searchParams;

  let logoUrl = q.get("logo") ?? process.env.PDF_BRAND_LOGO_URL ?? undefined;
  if (logoUrl) {
    try {
      const logoHost = new URL(logoUrl).hostname;
      const siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://imobintel.ro").hostname;
      if (logoHost !== siteHost && !logoHost.endsWith(`.${siteHost}`)) {
        logoUrl = undefined;
      }
    } catch {
      logoUrl = undefined;
    }
  }

  const brand = {
    name: q.get("brand") ?? process.env.PDF_BRAND_NAME ?? "ImobIntel",
    color: q.get("color") ?? process.env.PDF_BRAND_COLOR ?? "#6A7DFF",
    logoUrl,
  };

  const sections = {
    overview: bool(q, "overview", true),
    avm: bool(q, "avm", true),
    tts: bool(q, "tts", true),
    yield: bool(q, "yield", true),
    risk: bool(q, "risk", true),
    gallery: bool(q, "gallery", true),
    provenance: bool(q, "provenance", true),
    priceAnchors: bool(q, "priceAnchors", true),
  };

  const pdf = <ReportPdf data={data} brand={brand} sections={sections} />;
  const stream = await renderToStream(pdf);

  if (userId && !fromPerReport) {
    await incUsage(userId, "pdf", 1);
  }

  // renderToStream returns an async iterable/stream-like value; NextResponse accepts a Readable stream.
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="report-${id}.pdf"`,
    },
  });
}
