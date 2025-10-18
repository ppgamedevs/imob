"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type PriceRange = { low: number; high: number; mid: number; conf: number };

type Props = {
  priceRange: PriceRange | null;
  actualPrice?: number | null;
};
function compareBadge(actual: number | undefined | null, mid: number) {
  if (!actual) return { label: "—", variant: "outline" as const };
  const ratio = actual / mid;
  if (ratio < 0.9) return { label: "Under", variant: "secondary" as const };
  if (ratio > 1.1) return { label: "Over", variant: "destructive" as const };
  return { label: "Fair", variant: "default" as const };
}

export function AvmCard({ priceRange, actualPrice }: Props) {
  const badge = priceRange
    ? compareBadge(actualPrice, priceRange.mid)
    : { label: "—", variant: ("outline" as const) };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="font-medium">Preț estimat</div>
            <div className="flex items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm text-muted-foreground underline">Cum calculăm</span>
              </TooltipTrigger>
              <TooltipContent>
                Folosim mediane €/m² pe grid, ajustări pentru etaj, anul clădirii, distanța la metrou și starea din poze.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {priceRange ? (
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">
              {priceRange.mid.toLocaleString("ro-RO")} €
            </div>
            <div className="text-sm text-muted-foreground">
              ({priceRange.low.toLocaleString("ro-RO")} - {priceRange.high.toLocaleString("ro-RO")} {""})
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Calcul în curs…</div>
        )}
      </CardContent>
    </Card>
  );
}

export default AvmCard;
