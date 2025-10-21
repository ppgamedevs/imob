"use client";
import { useCallback } from "react";

export function ShareCTAs({ analysisId, slug }: { analysisId: string; slug: string }) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const url = `${base}/s/${slug}`;

  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    alert("Link copiat în clipboard!");
  }, [url]);

  const onDownloadPDF = useCallback(() => {
    // Fire and forget beacon for DOWNLOAD_PDF tracking
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/usage", JSON.stringify({ action: "DOWNLOAD_PDF", analysisId }));
    }
  }, [analysisId]);

  const onSave = useCallback(() => {
    // Fire and forget beacon for SAVE_REPORT tracking
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/usage", JSON.stringify({ action: "SAVE_REPORT", analysisId }));
    }
    alert("Raport salvat! (v1)");
  }, [analysisId]);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        href={`/api/report/${analysisId}/pdf`}
        target="_blank"
        onClick={onDownloadPDF}
      >
        📄 PDF
      </a>
      <button
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        onClick={onCopy}
      >
        🔗 Copiază link
      </button>
      <button
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        onClick={onSave}
      >
        💾 Salvează
      </button>
    </div>
  );
}
