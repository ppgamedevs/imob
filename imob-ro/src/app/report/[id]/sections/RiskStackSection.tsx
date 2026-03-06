"use client";

import { CarFront, ShieldAlert, Waves, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  buildRecommendedNextStep,
  buildRiskInsights,
  orderRiskLayerKeys,
  RISK_LAYER_LABELS,
  sourceModeForLayer,
} from "@/lib/risk/executive";
import { buildSeismicRiskLayerFromExplain } from "@/lib/risk/seismic-layer";
import { computeOverall } from "@/lib/risk/stack";
import type { RiskLayerKey, RiskLayerResult, RiskLevel, RiskStackResult } from "@/lib/risk/types";
import { cn } from "@/lib/utils";

import SeismicSection from "./SeismicSection";

interface Props {
  riskStack?: RiskStackResult | Record<string, unknown> | null;
  seismicExplain?: Record<string, unknown> | null;
  titleMentionsRisk?: boolean;
  storageKey?: string;
}

const LAYER_LABELS: Record<RiskLayerKey, string> = {
  seismic: RISK_LAYER_LABELS.seismic,
  flood: RISK_LAYER_LABELS.flood,
  pollution: RISK_LAYER_LABELS.pollution,
  traffic: RISK_LAYER_LABELS.traffic,
};

const LAYER_META: Record<
  RiskLayerKey,
  { icon: typeof ShieldAlert; iconClass: string; chipClass: string }
> = {
  seismic: {
    icon: ShieldAlert,
    iconClass: "text-red-700",
    chipClass: "bg-red-50 border-red-200",
  },
  flood: {
    icon: Waves,
    iconClass: "text-blue-700",
    chipClass: "bg-blue-50 border-blue-200",
  },
  pollution: {
    icon: Wind,
    iconClass: "text-amber-700",
    chipClass: "bg-amber-50 border-amber-200",
  },
  traffic: {
    icon: CarFront,
    iconClass: "text-purple-700",
    chipClass: "bg-purple-50 border-purple-200",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function levelLabel(level: RiskLevel): string {
  if (level === "high") return "Ridicat";
  if (level === "medium") return "Mediu";
  if (level === "low") return "Scazut";
  return "Necunoscut";
}

function levelVariant(level: RiskLevel): "success" | "warn" | "danger" | "outline" {
  if (level === "high") return "danger";
  if (level === "medium") return "warn";
  if (level === "low") return "success";
  return "outline";
}

function levelBadgeClass(level: RiskLevel): string {
  if (level === "high") return "border-red-200 bg-red-50 text-red-800";
  if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  if (level === "low") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function sourceModeLabel(mode: "official" | "proxy"): string {
  return mode === "official" ? "Oficial" : "Proxy";
}

function sourceModeClass(mode: "official" | "proxy"): string {
  return mode === "official"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-sky-200 bg-sky-50 text-sky-800";
}

function sourceModeTooltip(mode: "official" | "proxy"): string {
  return mode === "official"
    ? "Strat bazat pe o sursa publica dedicata sau pe o potrivire directa cu registrul oficial."
    : "Strat estimat din surse indirecte, precum OpenStreetMap sau infrastructura de transport, util pentru comparatie rapida.";
}

function normalizeForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function makeUnknownLayer(key: RiskLayerKey): RiskLayerResult {
  return {
    key,
    level: "unknown",
    score: null,
    confidence: null,
    summary:
      "Date indisponibile momentan. Stratul este pregatit, dar dataset-ul nu este integrat inca.",
    details: ["Integrarea este in curs. Pana atunci, acest strat nu influenteaza verdictul final."],
    sourceName: "Dataset neintegrat momentan",
    sourceUrl: null,
    updatedAt: null,
  };
}

function normalizeLayer(
  key: RiskLayerKey,
  raw: unknown,
  fallback?: RiskLayerResult,
): RiskLayerResult {
  if (!isRecord(raw)) {
    return fallback ?? makeUnknownLayer(key);
  }

  return {
    key,
    level:
      raw.level === "low" ||
      raw.level === "medium" ||
      raw.level === "high" ||
      raw.level === "unknown"
        ? raw.level
        : (fallback?.level ?? "unknown"),
    score: typeof raw.score === "number" ? raw.score : (fallback?.score ?? null),
    confidence:
      typeof raw.confidence === "number" ? raw.confidence : (fallback?.confidence ?? null),
    summary:
      typeof raw.summary === "string" && raw.summary.trim().length > 0
        ? raw.summary
        : (fallback?.summary ?? makeUnknownLayer(key).summary),
    details: Array.isArray(raw.details)
      ? raw.details.filter((item): item is string => typeof item === "string")
      : (fallback?.details ?? makeUnknownLayer(key).details),
    sourceName:
      typeof raw.sourceName === "string" || raw.sourceName === null
        ? raw.sourceName
        : (fallback?.sourceName ?? null),
    sourceUrl:
      typeof raw.sourceUrl === "string" || raw.sourceUrl === null
        ? raw.sourceUrl
        : (fallback?.sourceUrl ?? null),
    updatedAt:
      typeof raw.updatedAt === "string" || raw.updatedAt === null
        ? raw.updatedAt
        : (fallback?.updatedAt ?? null),
  };
}

function normalizeRiskStack(
  raw: RiskStackResult | Record<string, unknown> | null | undefined,
  seismicExplain: Record<string, unknown> | null | undefined,
): RiskStackResult {
  const rawLayers = isRecord(raw?.layers) ? raw.layers : null;
  const fallbackSeismic = buildSeismicRiskLayerFromExplain(seismicExplain ?? null, null);
  const layers: Record<RiskLayerKey, RiskLayerResult> = {
    seismic: normalizeLayer("seismic", rawLayers?.seismic, fallbackSeismic),
    flood: normalizeLayer("flood", rawLayers?.flood),
    pollution: normalizeLayer("pollution", rawLayers?.pollution),
    traffic: normalizeLayer("traffic", rawLayers?.traffic),
  };
  const computedOverall = computeOverall(layers);
  const notes = Array.isArray(raw?.notes)
    ? raw.notes.filter((item): item is string => typeof item === "string")
    : computedOverall.notes;

  return {
    overallScore:
      typeof raw?.overallScore === "number" ? raw.overallScore : computedOverall.overallScore,
    overallLevel:
      raw?.overallLevel === "low" ||
      raw?.overallLevel === "medium" ||
      raw?.overallLevel === "high" ||
      raw?.overallLevel === "unknown"
        ? raw.overallLevel
        : computedOverall.overallLevel,
    layers,
    notes,
  };
}

function GenericLayerBody({ layer }: { layer: RiskLayerResult }) {
  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <p className="text-sm text-muted-foreground">{layer.summary}</p>

      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-muted-foreground">Incredere</div>
          <div className="font-medium">
            {layer.confidence != null ? `${Math.round(layer.confidence * 100)}%` : "In curs"}
          </div>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-muted-foreground">Sursa</div>
          <div className="font-medium">{layer.sourceName ?? "Dataset neintegrat momentan"}</div>
        </div>
        <div className="rounded-md border bg-muted/20 px-3 py-2">
          <div className="text-muted-foreground">Actualizat</div>
          <div className="font-medium">
            {layer.updatedAt ? layer.updatedAt.slice(0, 10) : "Momentan"}
          </div>
        </div>
      </div>

      {layer.details && layer.details.length > 0 && (
        <ul className="space-y-1">
          {layer.details.map((detail, index) => (
            <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}

      {layer.level === "unknown" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          In curand: stratul va afisa un scor calibrat si o sursa explicita imediat ce dataset-ul
          este integrat.
        </div>
      )}

      {layer.sourceUrl && (
        <a
          href={layer.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs text-primary underline"
        >
          Deschide sursa
        </a>
      )}
    </div>
  );
}

export default function RiskStackSection({
  riskStack,
  seismicExplain,
  titleMentionsRisk = false,
  storageKey,
}: Props) {
  const resolved = normalizeRiskStack(riskStack, seismicExplain);
  const accordionStorageKey = storageKey
    ? `risk-stack:open:${storageKey}`
    : "risk-stack:open:default";
  const orderedKeys = useMemo(() => {
    return orderRiskLayerKeys(resolved.layers);
  }, [resolved.layers]);
  const insightBlock = useMemo(
    () => buildRiskInsights(resolved, orderedKeys),
    [orderedKeys, resolved],
  );
  const recommendedNextStep = useMemo(
    () => buildRecommendedNextStep(resolved, insightBlock.dominantKey),
    [insightBlock.dominantKey, resolved],
  );
  const insightItems = useMemo(() => {
    const noteTexts = resolved.notes.map(normalizeForCompare);
    return insightBlock.items.filter((item) => {
      const normalizedItem = normalizeForCompare(item);
      if (/lipsesc date ferme|verdictul general ramane partial/.test(normalizedItem)) {
        return !noteTexts.some(
          (note) =>
            note.includes("straturi indisponibile momentan") ||
            note.includes("scorul general nu este calculat"),
        );
      }
      return true;
    });
  }, [insightBlock.items, resolved.notes]);
  const allLayersUnknown = useMemo(
    () => orderedKeys.every((key) => resolved.layers[key].level === "unknown"),
    [orderedKeys, resolved.layers],
  );
  const [openItem, setOpenItem] = useState<RiskLayerKey>(orderedKeys[0] ?? "seismic");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(accordionStorageKey);
    if (
      stored === "seismic" ||
      stored === "flood" ||
      stored === "pollution" ||
      stored === "traffic"
    ) {
      setOpenItem(stored);
      return;
    }

    setOpenItem(orderedKeys[0] ?? "seismic");
  }, [accordionStorageKey, orderedKeys]);

  function handleOpenChange(value: string) {
    const nextValue =
      value === "seismic" || value === "flood" || value === "pollution" || value === "traffic"
        ? value
        : (orderedKeys[0] ?? "seismic");

    setOpenItem(nextValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(accordionStorageKey, nextValue);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Risk stack</CardTitle>
            <p className="text-xs text-muted-foreground">
              Vedere unificata asupra riscurilor structurale, de mediu si de confort urban.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={levelVariant(resolved.overallLevel)}
              className={cn("border", levelBadgeClass(resolved.overallLevel))}
            >
              {levelLabel(resolved.overallLevel)}
            </Badge>
            <div
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                resolved.overallScore != null
                  ? "border-border bg-muted/20 text-foreground"
                  : "border-dashed border-muted-foreground/40 text-muted-foreground",
              )}
            >
              {resolved.overallScore != null ? `${resolved.overallScore}/100` : "Scor indisponibil"}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {resolved.notes.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            {resolved.notes.join(" ")}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <span className="font-medium text-slate-900">Cum citesti scorul:</span> `0-34` scazut,
          `35-69` mediu, `70-100` ridicat. `Oficial` indica o sursa directa sau un registru public,
          iar `Proxy` indica o estimare contextuala utila pentru comparatie rapida.
        </div>

        {insightBlock.dominantKey && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-red-900">
              <span>Top risk</span>
              <Badge className="border border-red-200 bg-white text-red-800">
                {LAYER_LABELS[insightBlock.dominantKey]}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-red-800">
              {resolved.layers[insightBlock.dominantKey].summary}
            </p>
          </div>
        )}

        {!allLayersUnknown && insightItems.length > 0 && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-3">
            <div className="text-sm font-medium text-violet-900">Concluzii rapide</div>
            <ul className="mt-2 space-y-1">
              {insightItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-violet-900">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendedNextStep && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
            <div className="text-sm font-medium text-emerald-900">Pas recomandat</div>
            <p className="mt-1 text-xs text-emerald-900">{recommendedNextStep}</p>
          </div>
        )}

        <Accordion
          type="single"
          collapsible
          value={openItem}
          onValueChange={handleOpenChange}
          className="rounded-lg border"
        >
          {orderedKeys.map((key) => {
            const layer = resolved.layers[key];
            const meta = LAYER_META[key];
            const Icon = meta.icon;
            const sourceMode = sourceModeForLayer(key);
            return (
              <AccordionItem
                key={key}
                value={key}
                className="bg-card px-3 transition-colors data-[state=open]:bg-muted/10"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className={cn("rounded-full border p-2", meta.chipClass)}>
                        <Icon className={cn("h-4 w-4", meta.iconClass)} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{LAYER_LABELS[key]}</div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "inline-flex cursor-help items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                  sourceModeClass(sourceMode),
                                )}
                              >
                                {sourceModeLabel(sourceMode)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                              {sourceModeTooltip(sourceMode)}
                            </TooltipContent>
                          </Tooltip>
                          {layer.level === "unknown" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex cursor-help items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  In curs
                                </span>
                              </TooltipTrigger>
                              <TooltipContent sideOffset={6}>
                                Layer-ul este pregatit, dar acuratetea lui va creste pe masura ce
                                conectam surse suplimentare.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {layer.sourceName && (
                            <span className="text-[11px] text-muted-foreground">
                              {layer.sourceName}
                            </span>
                          )}
                          {layer.confidence != null && (
                            <span className="text-[11px] text-muted-foreground">
                              incredere {Math.round(layer.confidence * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 hidden md:block">
                      <p className="mt-1 text-xs text-muted-foreground">{layer.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {layer.score != null && (
                        <span className="text-sm font-semibold text-foreground">
                          {layer.score}/100
                        </span>
                      )}
                      <Badge
                        variant={levelVariant(layer.level)}
                        className={cn("border text-xs", levelBadgeClass(layer.level))}
                      >
                        {levelLabel(layer.level)}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground md:hidden">{layer.summary}</p>
                </AccordionTrigger>

                <AccordionContent>
                  {key === "seismic" ? (
                    <div className="mt-3 border-t pt-3">
                      <SeismicSection
                        embedded
                        riskClass={(seismicExplain?.riskClass as string) ?? null}
                        confidence={(seismicExplain?.confidence as number) ?? null}
                        method={(seismicExplain?.method as string) ?? null}
                        note={(seismicExplain?.note as string) ?? null}
                        sourceUrl={(seismicExplain?.sourceUrl as string) ?? null}
                        matchedAddress={(seismicExplain?.matchedAddress as string) ?? null}
                        intervention={(seismicExplain?.intervention as string) ?? null}
                        nearby={
                          (seismicExplain?.nearby as {
                            total: number;
                            rsI: number;
                            rsII: number;
                            buildings: {
                              address: string;
                              riskClass: string;
                              distanceM: number;
                              intervention: string | null;
                            }[];
                          }) ?? null
                        }
                        titleMentionsRisk={titleMentionsRisk}
                      />
                    </div>
                  ) : (
                    <GenericLayerBody layer={layer} />
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
