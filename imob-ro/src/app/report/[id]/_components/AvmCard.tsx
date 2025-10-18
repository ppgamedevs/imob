"use client";

import React from "react";

import { Badge, badgeVariants } from "@/components/ui/badge";

type Props = {
  priceRange: { low: number; high: number; mid: number; conf: number } | null;
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
    : { label: "—", variant: "outline" as const };

  return (
    <div className="rounded-lg-2 overflow-hidden glass-card p-4 shadow-card-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Preț estimat</div>
          <div className="text-2xl font-extrabold">
            {priceRange ? priceRange.mid.toLocaleString("ro-RO") + " €" : "—"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={badge.variant as keyof typeof badgeVariants}>{badge.label}</Badge>
          <div className="text-xs text-muted-foreground">
            Confidență: {priceRange ? `${Math.round(priceRange.conf * 100)}%` : "—"}
          </div>
        </div>
      </div>

      {priceRange && (
        <div className="mt-3 text-sm text-muted-foreground">
          Interval: {priceRange.low.toLocaleString("ro-RO")} -{" "}
          {priceRange.high.toLocaleString("ro-RO")} €
        </div>
      )}
    </div>
  );
}

export default AvmCard;
