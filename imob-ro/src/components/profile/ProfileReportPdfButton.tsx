"use client";

import { useCallback, useState } from "react";
import { postFunnelEvent } from "@/lib/tracking/funnel-client";

const pdfHref = (analysisId: string) => `/api/report/${analysisId}/pdf?`;

type Props = { analysisId: string; className?: string };

/**
 * One-shot PDF download for profile list rows (user already has per-report access).
 */
export function ProfileReportPdfButton({ analysisId, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const href = pdfHref(analysisId);

  const handleDownload = useCallback(async () => {
    setError(null);
    setLoading(true);
    postFunnelEvent({
      eventName: "pdf_download_clicked",
      analysisId,
      path: "/profile",
    });
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "PDF indisponibil acum.");
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
        path: "/profile",
        metadata: { sizeBytes: blob.size, context: "profile" },
      });
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setLoading(false);
    }
  }, [analysisId, href]);

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={
          className ??
          "text-[12px] font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 disabled:opacity-50"
        }
      >
        {loading ? "Se generează…" : "Descarcă PDF"}
      </button>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </span>
  );
}
