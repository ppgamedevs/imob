import { ExternalLink, MapPin } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * ReportSummary - Property header with key info
 *
 * Features:
 * - Price + €/m² prominently displayed
 * - AVM badge (Underpriced/Fair/Overpriced)
 * - Meta row: area, rooms, floor, year, metro distance
 * - Source info with favicon
 * - Last updated timestamp
 */

export interface ReportSummaryProps {
  title: string;
  areaName: string;
  priceEur: number;
  eurM2?: number;
  avmBadge?: "under" | "fair" | "over";
  meta: {
    areaM2?: number;
    rooms?: number;
    floor?: string;
    year?: number;
    distMetroM?: number;
  };
  source: {
    host: string;
    url: string;
    faviconUrl?: string;
  };
  updatedAt?: Date;
}

export default function ReportSummary({
  title,
  areaName,
  priceEur,
  eurM2,
  avmBadge,
  meta,
  source,
  updatedAt,
}: ReportSummaryProps) {
  const relativeTime = updatedAt ? getRelativeTime(updatedAt) : null;

  return (
    <div className="space-y-4">
      {/* Title + Location */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold leading-tight mb-2">{title}</h1>
        <div className="flex items-center gap-2 text-muted">
          <MapPin className="h-4 w-4" />
          <span className="font-medium">{areaName}</span>
        </div>
      </div>

      {/* Price Row */}
      <div className="flex items-baseline justify-between gap-4 py-4 border-y border-border">
        <div className="flex items-baseline gap-3">
          <div className="text-3xl lg:text-4xl font-bold tracking-tight">{formatEur(priceEur)}</div>
          {eurM2 && <div className="text-lg text-muted">{formatEur(eurM2)}/m²</div>}
        </div>
        {avmBadge && <AvmBadge badge={avmBadge} />}
      </div>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {meta.areaM2 && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Suprafață:</span>
            <span className="font-medium">{meta.areaM2} m²</span>
          </div>
        )}
        {meta.rooms && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Camere:</span>
            <span className="font-medium">{meta.rooms}</span>
          </div>
        )}
        {meta.floor && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Etaj:</span>
            <span className="font-medium">{meta.floor}</span>
          </div>
        )}
        {meta.year && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted">An:</span>
            <span className="font-medium">{meta.year}</span>
          </div>
        )}
        {typeof meta.distMetroM === "number" && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Metrou:</span>
            <span className="font-medium">{Math.round(meta.distMetroM)} m</span>
          </div>
        )}
      </div>

      {/* Source + Updated */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2",
            "text-muted hover:text-text transition-colors",
            "focus-ring rounded-sm",
          )}
        >
          {source.faviconUrl && (
            <img src={source.faviconUrl} alt="" width={16} height={16} className="rounded-sm" />
          )}
          <span className="font-medium">{source.host}</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        {relativeTime && <span className="text-xs text-muted">Actualizat {relativeTime}</span>}
      </div>
    </div>
  );
}

/** AVM Badge Component */
function AvmBadge({ badge }: { badge: "under" | "fair" | "over" }) {
  const config = {
    under: {
      label: "Underpriced",
      variant: "default" as const,
      className: "bg-success/15 text-success border-success/30",
    },
    fair: {
      label: "Fair",
      variant: "secondary" as const,
      className: "bg-warning/15 text-warning border-warning/30",
    },
    over: {
      label: "Overpriced",
      variant: "destructive" as const,
      className: "bg-danger/15 text-danger border-danger/30",
    },
  };

  const { label, className } = config[badge];

  return <Badge className={cn("text-sm font-semibold", className)}>{label}</Badge>;
}

/** Format EUR currency */
function formatEur(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Get relative time string */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "astăzi";
  if (diffDays === 1) return "ieri";
  if (diffDays < 7) return `acum ${diffDays} zile`;
  if (diffDays < 30) return `acum ${Math.floor(diffDays / 7)} săptămâni`;
  if (diffDays < 365) return `acum ${Math.floor(diffDays / 30)} luni`;
  return `acum ${Math.floor(diffDays / 365)} ani`;
}
