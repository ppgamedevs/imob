"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NeighborArea } from "@/lib/areas/dto";
import { formatChange, formatNumber } from "@/lib/areas/series";
import { cn } from "@/lib/utils";

export interface CompareAreasProps {
  currentSlug: string;
  currentName: string;
  neighbors: NeighborArea[];
}

export default function CompareAreas({ currentSlug, currentName, neighbors }: CompareAreasProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedSlugs, setSelectedSlugs] = React.useState<string[]>([]);

  const toggleArea = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug].slice(0, 3),
    );
  };

  const selectedAreas = neighbors.filter((n) => selectedSlugs.includes(n.slug));

  const compareUrl =
    selectedSlugs.length > 0
      ? `/compare/areas?areas=${[currentSlug, ...selectedSlugs].join(",")}`
      : "#";

  return (
    <div className="container py-8">
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="text-xl font-bold text-fg mb-6">Compară {currentName} cu alte zone</h2>

        <div className="grid lg:grid-cols-[300px_1fr] gap-8">
          {/* Left: Area selector */}
          <div>
            <div className="text-sm text-muted mb-2">Selectează zone (max 3)</div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={neighbors.length === 0}
                >
                  {selectedSlugs.length > 0
                    ? `${selectedSlugs.length} zone selectate`
                    : "Alege zone..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {neighbors.map((area) => (
                    <button
                      key={area.slug}
                      onClick={() => toggleArea(area.slug)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors",
                        selectedSlugs.includes(area.slug) && "bg-accent",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border border-primary",
                          selectedSlugs.includes(area.slug)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50",
                        )}
                      >
                        {selectedSlugs.includes(area.slug) && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{area.name}</div>
                        <div className="text-xs text-muted">
                          {formatNumber(area.medianEurM2)} €/m²
                          {area.distanceKm && ` · ${area.distanceKm.toFixed(1)} km`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {selectedAreas.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedAreas.map((area) => (
                  <div
                    key={area.slug}
                    className="flex items-center justify-between text-sm p-2 rounded bg-accent"
                  >
                    <span className="font-medium">{area.name}</span>
                    <button
                      onClick={() => toggleArea(area.slug)}
                      className="text-muted hover:text-fg"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedSlugs.length > 0 && (
              <Button asChild className="w-full mt-4">
                <Link href={compareUrl}>Deschide comparația completă</Link>
              </Button>
            )}
          </div>

          {/* Right: Quick comparison chart */}
          <div>
            {selectedAreas.length > 0 ? (
              <div className="space-y-4">
                <ComparisonBar
                  label="Preț median €/m²"
                  currentValue={neighbors[0]?.medianEurM2 || 0}
                  currentName={currentName}
                  areas={selectedAreas}
                />
                <ComparisonBar
                  label="Anunțuri active"
                  currentValue={neighbors[0]?.listingsNow || 0}
                  currentName={currentName}
                  areas={selectedAreas}
                  valueKey="listingsNow"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted">
                <div>
                  <p className="mb-2">Selectează până la 3 zone</p>
                  <p className="text-sm">pentru a vedea comparația</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Horizontal bar comparison
interface ComparisonBarProps {
  label: string;
  currentValue: number;
  currentName: string;
  areas: NeighborArea[];
  valueKey?: "medianEurM2" | "listingsNow";
}

function ComparisonBar({
  label,
  currentValue,
  currentName,
  areas,
  valueKey = "medianEurM2",
}: ComparisonBarProps) {
  const allValues = [
    { name: currentName, value: currentValue, isCurrent: true },
    ...areas.map((a) => ({
      name: a.name,
      value: valueKey === "medianEurM2" ? a.medianEurM2 : a.listingsNow || 0,
      isCurrent: false,
    })),
  ];

  const maxValue = Math.max(...allValues.map((v) => v.value));

  return (
    <div>
      <div className="text-sm font-medium text-fg mb-3">{label}</div>
      <div className="space-y-2">
        {allValues.map((item) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={cn("text-muted", item.isCurrent && "font-medium text-fg")}>
                  {item.name}
                </span>
                <span className="font-medium text-fg">
                  {valueKey === "medianEurM2"
                    ? `${formatNumber(item.value)} €/m²`
                    : item.value.toString()}
                </span>
              </div>
              <div className="h-6 w-full bg-muted rounded-md overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    item.isCurrent ? "bg-primary" : "bg-primary/60",
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
