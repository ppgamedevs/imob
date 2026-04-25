"use client";
import { postFunnelEvent } from "@/lib/tracking/funnel-client";
import { useCallback, useMemo, useState } from "react";

const SECTION_LABELS: Record<string, string> = {
  overview: "Prezentare",
  avm: "Estimare pret",
  tts: "Timp vanzare",
  yield: "Randament",
  risk: "Risc seismic",
  gallery: "Galerie foto",
  provenance: "Provenienta",
  priceAnchors: "Ancore pret",
};

export function PdfActions({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSections, setShowSections] = useState(false);

  const [toggle, setToggle] = useState({
    overview: true,
    avm: true,
    tts: true,
    yield: true,
    risk: true,
    gallery: true,
    provenance: true,
    priceAnchors: true,
  });

  const href = useMemo(() => {
    const p = new URLSearchParams();
    for (const k of Object.keys(toggle) as (keyof typeof toggle)[]) {
      if (toggle[k] === false) p.set(k, "false");
    }
    return `/api/report/${analysisId}/pdf?` + p.toString();
  }, [analysisId, toggle]);

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
        setError(data.message ?? "Limita de PDF-uri atinsa. Upgrade la un plan superior.");
        return;
      }
      if (res.status === 403) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(
          data.message ??
            "Acces PDF refuzat: deblocheaza raportul sau conecteaza-te la contul cu care ai platit.",
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
      setError("Eroare de retea. Incearca din nou.");
    } finally {
      setLoading(false);
    }
  }, [href, analysisId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          Descarca PDF
        </button>

        <button
          onClick={() => setShowSections(!showSections)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          {showSections ? "Ascunde sectiuni" : "Personalizeaza sectiuni"}
        </button>
      </div>

      {showSections && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground border rounded-lg p-3">
          {(Object.keys(toggle) as (keyof typeof toggle)[]).map((k) => (
            <label key={k} className="inline-flex items-center gap-2 cursor-pointer select-none group">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${toggle[k] ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white group-hover:border-gray-400"}`}>
                {toggle[k] && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={toggle[k]}
                onChange={(e) => setToggle({ ...toggle, [k]: e.target.checked })}
              />
              {SECTION_LABELS[k] ?? k}
            </label>
          ))}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
