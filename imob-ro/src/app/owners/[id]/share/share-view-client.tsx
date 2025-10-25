"use client";

import { AlertTriangle, Clock, Home, Mail, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/Surface";
import { getScoreTier } from "@/lib/owner/score";
import type { OwnerDashboardData } from "@/types/owner";

export function ShareViewClient({ data }: { data: OwnerDashboardData }) {
  const scoreTier = getScoreTier(data.preMarketScore.score);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Header with watermark */}
        <div className="mb-8 pb-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {data.listing.address || "Estimare Proprietate"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Raport generat de iR · Read-only view
              </p>
            </div>
            <Button variant="default" size="lg">
              <Mail className="mr-2 h-4 w-4" />
              Contact proprietar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
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
                <div className="text-sm text-muted-foreground">
                  Interval: €{data.scores.avmLow.toLocaleString()} - €
                  {data.scores.avmHigh.toLocaleString()}
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
                Estimat pe baza datelor istorice din zonă
              </p>
            </Surface>

            {/* Yield Card */}
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

            {/* Seismic Risk */}
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
                  Clasa de risc seismic conform clasificării oficiale
                </p>
              </Surface>
            )}

            {/* Applied ROI Fixes */}
            {data.roiItems.some((x) => x.selected) && (
              <Surface elevation={1} className="p-6">
                <h2 className="text-xl font-semibold mb-4">Îmbunătățiri aplicate</h2>

                <div className="space-y-3">
                  {data.roiItems
                    .filter((x) => x.selected)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.label}</div>
                          <div className="text-sm text-muted-foreground mt-1">{item.note}</div>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-muted-foreground">
                              Cost: €{item.cost[0]}-{item.cost[1]}
                            </span>
                            <span
                              className={
                                item.impact.type === "avm" ? "text-success" : "text-primary"
                              }
                            >
                              {item.impact.type === "avm" ? "+" : "-"}
                              {item.impact.pct}% {item.impact.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Surface>
            )}
          </div>

          {/* Sidebar */}
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

                <p className="text-xs text-muted-foreground">
                  Scor de pregătire pentru piață bazat pe preț, calitate și îmbunătățiri aplicate.
                </p>
              </Surface>

              {/* CTA Card */}
              <Surface elevation={1} className="p-6 text-center">
                <h3 className="font-semibold mb-2">Vrei estimarea ta?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generează o estimare gratuită în 60 secunde
                </p>
                <Button asChild className="w-full">
                  <Link href="/owners">Estimează proprietatea</Link>
                </Button>
              </Surface>

              {/* Disclaimer */}
              <div className="text-xs text-muted-foreground p-4 bg-muted/30 rounded-lg">
                <strong>Notă:</strong> Această estimare este generată automat pe baza datelor
                publice și are caracter informativ. Nu constituie o evaluare oficială.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
