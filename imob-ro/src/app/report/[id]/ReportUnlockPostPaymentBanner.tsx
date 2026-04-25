"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { postFunnelEvent } from "@/lib/tracking/funnel-client";

const DEFAULT_PDF_HREF = (analysisId: string) => `/api/report/${analysisId}/pdf?`;

type Props = {
  justPaid: boolean;
  canViewFullReport: boolean;
  isPublicSample: boolean;
  analysisId: string;
  /** Numbered list for clipboard; from negotiation assistant when full access. */
  agentQuestionsText: string;
  /** /profile for signed-in users; sign-in with return to /profile for guests. */
  myReportsHref: string;
  /** When true, deblocarea cere cont; emphasize lista din profil. */
  requireAccountForUnlock: boolean;
};

function BannerPdfDownload({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const href = DEFAULT_PDF_HREF(analysisId);

  const handleDownload = useCallback(async () => {
    setError(null);
    setLoading(true);
    postFunnelEvent({
      eventName: "pdf_download_clicked",
      analysisId,
      path: typeof window !== "undefined" ? window.location.pathname : "/report",
    });
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (res.status === 402) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "Limita de PDF-uri atinsa.");
        return;
      }
      if (res.status === 403) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(
          data.message ?? "Acces PDF refuzat. Deblochează raportul sau conectează-te la contul cu care ai plătit.",
        );
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "Eroare la generarea PDF-ului.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `raport-${analysisId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      postFunnelEvent({
        eventName: "pdf_download_completed",
        analysisId,
        path: typeof window !== "undefined" ? window.location.pathname : "/report",
        metadata: { sizeBytes: blob.size },
      });
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }, [analysisId, href]);

  return (
    <span className="inline-flex flex-col gap-0.5">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden
          />
        ) : null}
        Descarcă PDF
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}

function CopyAgentQuestionsButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text.trim()}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? "Copiat" : "Copiază întrebările pentru agent"}
    </button>
  );
}

function scrollToNegotiation() {
  const el = document.getElementById("report-negotiation");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ReportUnlockPostPaymentBanner({
  justPaid,
  canViewFullReport,
  isPublicSample,
  analysisId,
  agentQuestionsText,
  myReportsHref,
  requireAccountForUnlock,
}: Props) {
  useEffect(() => {
    if (!justPaid || isPublicSample) return;
    if (canViewFullReport) {
      postFunnelEvent({
        eventName: "report_unlock_success_banner_viewed",
        analysisId,
        path: typeof window !== "undefined" ? window.location.pathname : "/",
      });
    } else {
      postFunnelEvent({
        eventName: "report_unlock_pending_after_success_redirect",
        analysisId,
        path: typeof window !== "undefined" ? window.location.pathname : "/",
      });
    }
  }, [justPaid, canViewFullReport, isPublicSample, analysisId]);

  useEffect(() => {
    if (!justPaid || typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (u.searchParams.get("unlocked") !== "1") return;
    u.searchParams.delete("unlocked");
    const next = u.pathname + (u.search ? u.search : "") + u.hash;
    window.history.replaceState(null, "", next);
  }, [justPaid]);

  if (!justPaid || isPublicSample) return null;

  if (!canViewFullReport) {
    return (
      <div className="mb-4 max-w-3xl rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Plata este în curs de confirmare.</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-amber-900/90">
          Reîncarcă pagina în câteva secunde sau contactează-ne.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 max-w-3xl rounded-lg border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
      <p className="font-medium">Raport complet deblocat.</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-emerald-900/90">
        Poți citi analiza completă, descărca PDF-ul și folosi întrebările la vizionare.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
        <BannerPdfDownload analysisId={analysisId} />
        <button
          type="button"
          onClick={scrollToNegotiation}
          className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 transition-colors"
        >
          Vezi argumentele de negociere
        </button>
        <CopyAgentQuestionsButton text={agentQuestionsText} />
        <Link
          href={myReportsHref}
          className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 transition-colors"
        >
          Vezi rapoartele mele
        </Link>
      </div>
      {requireAccountForUnlock ? (
        <p className="mt-2 text-[11px] leading-relaxed text-emerald-900/80">
          Rapoartele deblocate cu plata rămân listate la „Rapoartele mele” în contul tău.
        </p>
      ) : null}
    </div>
  );
}
