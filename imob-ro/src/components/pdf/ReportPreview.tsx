"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { type ReportDocData } from "@/lib/pdf/reportDoc";

export default function ReportPreview({
  data,
  analysisId,
}: {
  data?: ReportDocData;
  analysisId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const fetchPdf = useCallback(async () => {
    if (!analysisId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/report/${analysisId}/pdf`);
      if (!res.ok) throw new Error("failed to generate pdf");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setPdfUrl(url);
    } catch (e) {
      console.error(e);
      alert("Nu s-a putut genera PDF-ul.");
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    if (open) fetchPdf();
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setPdfUrl(null);
      }
    };
    // intentionally only watch `open` — fetchPdf is stable via useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Previzualizează PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">Previzualizare PDF</div>
            {data && data.address && (
              <div className="text-sm text-muted-foreground">{data.address}</div>
            )}
            {data?.price != null && (
              <div className="text-sm text-muted-foreground">Preț: {data.price} EUR</div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/report/${analysisId}/pdf`);
                  if (!res.ok) throw new Error("failed to generate pdf");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `report-${analysisId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error(e);
                  alert("Nu s-a putut genera PDF-ul.");
                }
              }}
            >
              Descarcă PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  if (agencyLogo) params.set("agencyLogo", agencyLogo);
                  if (brandColor) params.set("brandColor", brandColor);
                  params.set("savePreset", "true");
                  const url = `/api/report/${analysisId}/pdf?${params.toString()}`;
                  const res = await fetch(url);
                  if (!res.ok) throw new Error("failed to generate pdf");
                  const blob = await res.blob();
                  const aurl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = aurl;
                  a.download = `report-${analysisId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(aurl);
                  alert("PDF exportat și preset salvat.");
                } catch (e) {
                  console.error(e);
                  alert("Nu s-a putut genera PDF-ul.");
                }
              }}
            >
              Exportă pentru client
            </Button>
          </div>
        </div>

        <div style={{ height: "70vh" }}>
          <div className="mb-3 flex gap-2">
            <input
              placeholder="Logo URL"
              value={agencyLogo ?? ""}
              onChange={(e) => setAgencyLogo(e.target.value)}
              className="border px-2 py-1"
            />
            <input
              placeholder="Brand color (hex)"
              value={brandColor ?? ""}
              onChange={(e) => setBrandColor(e.target.value)}
              className="border px-2 py-1 w-28"
            />
          </div>
          {loading && <div>Se încarcă previzualizarea...</div>}
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              title="Previzualizare PDF"
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
