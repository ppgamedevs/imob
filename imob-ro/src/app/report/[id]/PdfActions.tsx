"use client";
import { useCallback, useMemo, useState } from "react";

export function PdfActions({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const res = await fetch(href);
      if (res.status === 402) {
        const data = await res.json();
        setError(data.message ?? "Limita de PDF-uri atinsa. Upgrade la un plan superior.");
        return;
      }
      if (!res.ok) {
        setError("Eroare la generarea PDF-ului.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `raport-${analysisId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(toggle) as (keyof typeof toggle)[]).map((k) => (
            <label key={k} className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary/50 h-3 w-3"
                checked={toggle[k]}
                onChange={(e) => setToggle({ ...toggle, [k]: e.target.checked })}
              />
              {k === "priceAnchors" ? "Ancore pret" : k.charAt(0).toUpperCase() + k.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
