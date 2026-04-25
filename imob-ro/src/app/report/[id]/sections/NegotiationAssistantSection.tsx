"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NegotiationAssistantBundle } from "@/lib/report/negotiation-assistant";
import type { NegotiationPoint } from "@/lib/report/negotiation";

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

function CopyButton({ text, label }: { text: string; label: string }) {
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
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition-colors w-full"
    >
      {copied ? "Copiat în clipboard" : label}
    </button>
  );
}

function PointCard({ point, index }: { point: NegotiationPoint; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const icon = ICON_MAP[point.id] ?? "💡";

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 sm:px-4 py-3 flex items-start gap-3 min-h-[48px]"
      >
        <span className="text-lg shrink-0 mt-0.5" aria-hidden>
          {icon}
        </span>
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
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-3 space-y-2.5 border-t mx-2 sm:mx-3 pt-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-0.5">
              Dovadă (date publice)
            </div>
            <p className="text-xs text-foreground">{point.evidence}</p>
          </div>
          <div className="rounded-md bg-blue-50 p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium mb-0.5">
              Întrebare sugerată
            </div>
            <p className="text-xs text-blue-900 italic">&quot;{point.suggestedSellerQuestion}&quot;</p>
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  assistant: NegotiationAssistantBundle;
  points: NegotiationPoint[];
  /** Mesaj mai lung din vechiul generator (opțional, al doilea buton). */
  legacyWhatsAppDraft?: string;
  suggestedLow?: number | null;
  suggestedHigh?: number | null;
  currency?: string;
  canShowSubstantiveArguments?: boolean;
};

export default function NegotiationAssistantSection({
  assistant,
  points,
  legacyWhatsAppDraft,
  suggestedLow,
  suggestedHigh,
  currency = "EUR",
  canShowSubstantiveArguments = true,
}: Props) {
  const fmt = (n: number) => n.toLocaleString("ro-RO");

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base leading-snug">Asistent negociere</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Scop: să ai repere clare la discuția cu agentul sau proprietarul. Nu este consultanță
              juridică, nu îți oferim „ofertă legală” — validează orice act cu un specialist. Nu
              îți recomandăm o sumă concretă de ofertă decât când baza de date e suficient de solidă
              (vezi nota de mai jos).
            </p>
          </div>
          {canShowSubstantiveArguments && points.length > 0 ? (
            <Badge variant="secondary" className="shrink-0 w-fit text-[10px] sm:text-xs">
              {points.length} puncte din date
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        {/* Strategie */}
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">{assistant.strategy.titleRo}</h3>
          <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{assistant.strategy.bodyRo}</p>
        </section>

        {/* Argumente */}
        <section>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Argumente de negociere</h3>
          {!canShowSubstantiveArguments ? (
            <p className="text-sm text-muted-foreground">
              Comparabilele sau reperul de zonă nu sunt încă suficiente pentru o listă de argumente
              ancorate concret. Folosește oricum întrebările și mesajul de mai jos, apoi reîncarcă
              raportul când baza e mai completă.
            </p>
          ) : null}
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-800 pl-0.5">
            {assistant.leverageBulletsRo.map((line, i) => (
              <li key={i} className="leading-relaxed marker:text-slate-400 pl-1">
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* Detalii din motor (puncte extinse) */}
        {canShowSubstantiveArguments && points.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Detalii (dovezi & întrebări)</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Deschide fiecare punct pentru formulări legate de datele public din raport.
            </p>
            <div className="space-y-2">
              {points.map((pt, i) => (
                <PointCard key={pt.id} point={pt} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Interval ofertă — doar când e permis */}
        {suggestedLow != null && suggestedHigh != null && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold">
              Deschidere (reper din comparabile, medie-ieri)
            </div>
            <div className="text-sm sm:text-base font-bold text-blue-900 tabular-nums break-words">
              {fmt(suggestedLow)} – {fmt(suggestedHigh)} {currency}
            </div>
            <p className="text-[10px] text-blue-800 leading-snug">
              Doar când încrederea modelului e ridicată și ai suficiente comparabile. Nu e ofertă
              recomandată, ci interval orientativ din anunțuri, nu tranzacții oficiale.
            </p>
          </div>
        )}

        {/* Întrebări fixe */}
        <section>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Întrebări pentru agent/proprietar
          </h3>
          <ol className="list-decimal list-outside space-y-1.5 pl-4 sm:pl-5 text-sm text-slate-800">
            {assistant.practicalQuestionsRo.map((q, i) => (
              <li key={i} className="leading-relaxed pl-0.5">
                {q}
              </li>
            ))}
          </ol>
        </section>

        {/* Mesaj */}
        <section className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-900">Mesaj sugerat (WhatsApp / e-mail scurt)</h3>
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/90 p-3 text-xs sm:text-sm text-slate-900 font-sans leading-relaxed max-h-[min(50vh,320px)] overflow-y-auto">
            {assistant.suggestedMessageRo}
          </pre>
          <CopyButton
            text={assistant.suggestedMessageRo}
            label="Copiază mesajul scurt (recomandat)"
          />
          {legacyWhatsAppDraft && legacyWhatsAppDraft !== assistant.suggestedMessageRo ? (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] text-muted-foreground">Variantă detaliată (inclusiv observații din analiză):</p>
              <CopyButton
                text={legacyWhatsAppDraft}
                label="Copiază varianta detaliată"
              />
            </div>
          ) : null}
        </section>

        <p className="text-[10px] sm:text-xs text-muted-foreground border-t pt-3">
          Uneltele de mai sus se bazează pe anunțuri publice și pe modelele ImobIntel. Verifică
          informațiile la fața locului și înainte de semnări. Niciun text din acest asistent nu
          înlocuiește consiliere juridică sau o evaluare ANEVAR.
        </p>
      </CardContent>
    </Card>
  );
}
