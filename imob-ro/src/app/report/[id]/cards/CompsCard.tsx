import * as React from "react";
import { ChevronLeft, ChevronRight, Table as TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * CompsCard - Comparable properties
 * 
 * Shows:
 * - Horizontal carousel of comp cards (default)
 * - Toggle to table view
 * - Top 6 most similar properties
 */

export interface CompProperty {
  id: string;
  title: string;
  imageUrl: string;
  priceEur: number;
  eurM2: number;
  areaM2: number;
  rooms: number;
  distanceM: number; // Distance from subject property
  similarity: number; // 0-1
  sourceHost: string;
}

export interface CompsCardProps {
  comps: CompProperty[];
  subjectPriceEur: number;
  subjectEurM2: number;
}

export default function CompsCard({
  comps,
  subjectPriceEur,
  subjectEurM2,
}: CompsCardProps) {
  const [viewMode, setViewMode] = React.useState<"carousel" | "table">("carousel");
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? comps.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === comps.length - 1 ? 0 : prev + 1));
  };

  // Scroll carousel on index change
  React.useEffect(() => {
    if (viewMode === "carousel" && scrollRef.current) {
      const cardWidth = 280; // w-70 = 280px
      const gap = 12; // gap-3 = 12px
      scrollRef.current.scrollTo({
        left: currentIndex * (cardWidth + gap),
        behavior: "smooth",
      });
    }
  }, [currentIndex, viewMode]);

  if (!comps || comps.length === 0) {
    return (
      <div className="p-8 text-center text-muted">
        <p>Nu sunt disponibile proprietăți comparabile în acest moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">Proprietăți Similare</h2>
          <p className="text-sm text-muted">
            Top {comps.length} proprietăți comparabile din zonă
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMode(viewMode === "carousel" ? "table" : "carousel")}
        >
          <TableIcon className="h-4 w-4 mr-2" />
          {viewMode === "carousel" ? "Tabel" : "Carusel"}
        </Button>
      </div>

      {/* Carousel View */}
      {viewMode === "carousel" && (
        <div className="relative group">
          {/* Navigation Arrows */}
          {comps.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-bg/90 backdrop-blur rounded-full shadow-elev1 hover:bg-surface transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus-ring"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-bg/90 backdrop-blur rounded-full shadow-elev1 hover:bg-surface transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus-ring"
                aria-label="Următor"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Carousel */}
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
          >
            {comps.map((comp, idx) => (
              <CompCard
                key={comp.id}
                comp={comp}
                isActive={idx === currentIndex}
                subjectPriceEur={subjectPriceEur}
              />
            ))}
          </div>

          {/* Dots Indicator */}
          {comps.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {comps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all focus-ring",
                    idx === currentIndex
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted hover:bg-text/30"
                  )}
                  aria-label={`Proprietate ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted font-medium">Proprietate</th>
                <th className="text-right py-2 px-3 text-muted font-medium">Preț</th>
                <th className="text-right py-2 px-3 text-muted font-medium">€/m²</th>
                <th className="text-right py-2 px-3 text-muted font-medium">Suprafață</th>
                <th className="text-right py-2 px-3 text-muted font-medium">Camere</th>
                <th className="text-right py-2 px-3 text-muted font-medium">Distanță</th>
                <th className="text-right py-2 px-3 text-muted font-medium">Similaritate</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((comp) => {
                const priceDiff = ((comp.priceEur - subjectPriceEur) / subjectPriceEur) * 100;
                const eurM2Diff = ((comp.eurM2 - subjectEurM2) / subjectEurM2) * 100;
                return (
                  <tr key={comp.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={comp.imageUrl}
                            alt={comp.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{comp.title}</div>
                          <div className="text-xs text-muted">{comp.sourceHost}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-medium">{formatEur(comp.priceEur)}</div>
                      <div
                        className={cn(
                          "text-xs",
                          priceDiff > 0 ? "text-danger" : priceDiff < 0 ? "text-success" : "text-muted"
                        )}
                      >
                        {priceDiff > 0 ? "+" : ""}
                        {priceDiff.toFixed(0)}%
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-medium">{formatEur(comp.eurM2)}</div>
                      <div
                        className={cn(
                          "text-xs",
                          eurM2Diff > 0 ? "text-danger" : eurM2Diff < 0 ? "text-success" : "text-muted"
                        )}
                      >
                        {eurM2Diff > 0 ? "+" : ""}
                        {eurM2Diff.toFixed(0)}%
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">{comp.areaM2} m²</td>
                    <td className="py-3 px-3 text-right">{comp.rooms}</td>
                    <td className="py-3 px-3 text-right">{Math.round(comp.distanceM)} m</td>
                    <td className="py-3 px-3 text-right">
                      <Badge variant="outline">{Math.round(comp.similarity * 100)}%</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Individual Comp Card */
function CompCard({
  comp,
  isActive,
  subjectPriceEur,
}: {
  comp: CompProperty;
  isActive: boolean;
  subjectPriceEur: number;
}) {
  const priceDiff = ((comp.priceEur - subjectPriceEur) / subjectPriceEur) * 100;

  return (
    <div
      className={cn(
        "flex-shrink-0 w-70 snap-start",
        "p-3 rounded-lg border transition-all",
        isActive ? "border-primary shadow-elev1" : "border-border"
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] rounded overflow-hidden mb-3">
        <Image
          src={comp.imageUrl}
          alt={comp.title}
          fill
          className="object-cover"
          sizes="280px"
        />
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="bg-bg/90 backdrop-blur">
            {Math.round(comp.similarity * 100)}% similar
          </Badge>
        </div>
      </div>

      {/* Price */}
      <div className="mb-2">
        <div className="text-lg font-bold">{formatEur(comp.priceEur)}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">{formatEur(comp.eurM2)}/m²</span>
          <span
            className={cn(
              "text-xs font-medium",
              priceDiff > 0 && "text-danger",
              priceDiff < 0 && "text-success",
              priceDiff === 0 && "text-muted"
            )}
          >
            {priceDiff > 0 ? "+" : ""}
            {priceDiff.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-3 text-xs text-muted mb-2">
        <span>{comp.areaM2} m²</span>
        <span>{comp.rooms} cam</span>
        <span>{Math.round(comp.distanceM)} m</span>
      </div>

      {/* Title */}
      <div className="text-sm font-medium line-clamp-2 mb-2">{comp.title}</div>

      {/* Source */}
      <div className="text-xs text-muted">{comp.sourceHost}</div>
    </div>
  );
}

/** Format EUR currency */
function formatEur(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
