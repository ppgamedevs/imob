"use client";

import { useState } from "react";
import type { OwnerDashboardData } from "@/types/owner";
import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Home, AlertTriangle, Share2, Copy, Check } from "lucide-react";
import { getScoreTier } from "@/lib/owner/score";
import { generateShareLink, toggleRoiFix } from "./actions";

export function OwnerDashboardClient({ data }: { data: OwnerDashboardData }) {
  const [shareToken, setShareToken] = useState(data.draft.shareToken);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [roiToggles, setRoiToggles] = useState(data.draft.roiToggles);

  const handleGenerateShare = async () => {
    const result = await generateShareLink(data.analysisId);
    if (result.shareUrl) {
      setShareUrl(result.shareUrl);
      setShareToken(result.shareToken);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleFix = async (fixId: string) => {
    const newValue = !roiToggles[fixId];
    setRoiToggles({ ...roiToggles, [fixId]: newValue });
    await toggleRoiFix(data.analysisId, fixId, newValue);
  };

  const scoreTier = getScoreTier(data.preMarketScore.score);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {data.listing.address || "Proprietatea ta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dashboard privat · Actualizat automat
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Value Card */}
            <Surface elevation={1} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Valoare estimată</h2>
                </div>
                {data.scores.priceBadge && (
                  <Badge
                    variant={
                      data.scores.priceBadge === "UNDER"
                        ? "default"
                        : data.scores.priceBadge === "OVER"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {data.scores.priceBadge}
                  </Badge>
                )}
              </div>

              <div className="text-4xl font-bold text-primary mb-2">
                €{data.scores.avmMid?.toLocaleString() ?? "—"}
              </div>

              {data.scores.avmLow && data.scores.avmHigh && (
                <div className="text-sm text-muted-foreground mb-4">
                  Interval: €{data.scores.avmLow.toLocaleString()} - €
                  {data.scores.avmHigh.toLocaleString()}
                </div>
              )}

              {data.listing.price && data.scores.avmMid && (
                <div className="text-sm">
                  Prețul curent (€{data.listing.price.toLocaleString()}) este{" "}
                  {(((data.listing.price - data.scores.avmMid) / data.scores.avmMid) * 100).toFixed(
                    1,
                  )}
                  % {data.listing.price > data.scores.avmMid ? "peste" : "sub"} estimare.
                </div>
              )}
            </Surface>

            {/* TTS Card */}
            <Surface elevation={1} className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Viteza vânzării</h2>
              </div>

              {data.scores.ttsBucket && (
                <div className="mb-4">
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {data.scores.ttsBucket}
                  </Badge>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Bazat pe date istorice din zonă și caracteristicile proprietății.
              </p>
            </Surface>

            {/* Yield Card (if applicable) */}
            {data.scores.yieldNet && (
              <Surface elevation={1} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Home className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Randament închiriere</h2>
                </div>

                <div className="text-3xl font-bold text-primary mb-2">
                  {data.scores.yieldNet.toFixed(1)}%
                </div>

                <p className="text-sm text-muted-foreground">Randament net anual estimat</p>
              </Surface>
            )}

            {/* Seismic Risk Card */}
            {data.scores.riskClass && (
              <Surface elevation={1} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <h2 className="text-xl font-semibold">Risc seismic</h2>
                </div>

                <Badge
                  variant={data.scores.riskClass.includes("Rs") ? "destructive" : "secondary"}
                  className="text-base px-3 py-1"
                >
                  {data.scores.riskClass}
                </Badge>

                <p className="text-sm text-muted-foreground mt-3">
                  Clasa de risc seismic a clădirii conform clasificării oficiale.
                </p>
              </Surface>
            )}

            {/* ROI Fixes Card */}
            <Surface elevation={1} className="p-6">
              <h2 className="text-xl font-semibold mb-4">ROI Quick Fixes</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Îmbunătățiri cu impact mare și cost mic. Bifează cele pe care le aplici pentru a
                îmbunătăți Pre-Market Score.
              </p>

              <div className="space-y-4">
                {data.roiItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-surface/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={roiToggles[item.id] || false}
                      onChange={() => handleToggleFix(item.id)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{item.note}</div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-muted-foreground">
                          Cost: €{item.cost[0]}-{item.cost[1]}
                        </span>
                        <span
                          className={item.impact.type === "avm" ? "text-success" : "text-primary"}
                        >
                          {item.impact.type === "avm" ? "+" : "-"}
                          {item.impact.pct}% {item.impact.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </Surface>
          </div>

          {/* Sticky Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Pre-Market Score */}
              <Surface elevation={2} className="p-6">
                <h3 className="text-lg font-semibold mb-4">Pre-Market Score</h3>

                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(data.preMarketScore.score / 100) * 351} 351`}
                        className={scoreTier.color}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold">{data.preMarketScore.score}</div>
                      <div className="text-xs text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                </div>

                <div className={`text-center font-semibold mb-4 ${scoreTier.color}`}>
                  {scoreTier.label}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  {Object.entries(data.preMarketScore.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key}:</span>
                      <span className="font-medium">{value} pts</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                  Target: ≥75 pentru vânzare rapidă
                </p>
              </Surface>

              {/* Share Actions */}
              <Surface elevation={1} className="p-6">
                <h3 className="text-lg font-semibold mb-4">Partajare</h3>

                {!shareUrl ? (
                  <Button onClick={handleGenerateShare} className="w-full" variant="outline">
                    <Share2 className="mr-2 h-4 w-4" />
                    Generează Owner Link
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted/50 rounded-lg text-xs break-all">{shareUrl}</div>
                    <Button onClick={handleCopyLink} className="w-full" size="sm">
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copiat!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiază link
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Linkul arată doar estimări, nu date personale.
                    </p>
                  </div>
                )}
              </Surface>

              {/* Quick Actions */}
              <Surface elevation={1} className="p-6">
                <h3 className="text-lg font-semibold mb-4">Acțiuni rapide</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm" disabled>
                    📥 Descarcă PDF
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm" disabled>
                    📧 Trimite către agent
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Funcții disponibile în curând</p>
              </Surface>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
