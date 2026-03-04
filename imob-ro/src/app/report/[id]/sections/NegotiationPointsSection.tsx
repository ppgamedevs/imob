"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NegotiationPoint } from "@/lib/report/negotiation";

interface Props {
  points: NegotiationPoint[];
  whatsAppDraft: string;
}

const ICON_MAP: Record<string, string> = {
  overpriced: "💰",
  slightly_over: "📊",
  price_drops: "📉",
  duplicates: "🔄",
  reposted: "🔁",
  seismic_direct: "⚠️",
  seismic_nearby: "🏚️",
  nightlife_noise: "🎵",
  low_transit: "🚌",
  good_transit_fair: "🚇",
  old_building: "🏗️",
  renovation: "🔧",
  ground_floor: "⬇️",
  no_parking: "🅿️",
  no_elevator: "🪜",
  limited_zone: "📍",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
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
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors w-full justify-center"
    >
      {copied ? (
        <>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Copiat!
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
          Copiaza mesaj WhatsApp
        </>
      )}
    </button>
  );
}

function PointCard({ point, index }: { point: NegotiationPoint; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const icon = ICON_MAP[point.id] ?? "💡";

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className="text-lg shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
            <span className="text-sm font-semibold">{point.title}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{point.claim}</p>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1.5 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2.5 border-t mx-3 pt-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">
              Dovada
            </div>
            <p className="text-xs text-foreground">{point.evidence}</p>
          </div>
          <div className="rounded-md bg-blue-50 p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium mb-0.5">
              Intrebare sugerate pentru vanzator
            </div>
            <p className="text-xs text-blue-800 italic">
              &quot;{point.suggestedSellerQuestion}&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NegotiationPointsSection({ points, whatsAppDraft }: Props) {
  if (points.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Cum negociezi</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {points.length} argumente
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Argumente de negociere generate automat din datele raportului. Apasa pentru detalii si intrebari sugerate.
        </p>

        <div className="space-y-2">
          {points.map((pt, i) => (
            <PointCard key={pt.id} point={pt} index={i} />
          ))}
        </div>

        {/* WhatsApp draft copy */}
        <div className="pt-3 border-t">
          <CopyButton text={whatsAppDraft} />
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Copiaza un mesaj preformatat cu intrebarile de mai sus, gata de trimis pe WhatsApp.
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground pt-2 border-t">
          Toate argumentele sunt generate din date publice si au caracter orientativ. Verificati informatiile inainte de a le folosi in negociere.
        </p>
      </CardContent>
    </Card>
  );
}
