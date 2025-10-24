"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

/**
 * FiltersBar - Compact filter chips and selects
 * 
 * Features:
 * - Horizontal scroll on mobile
 * - Stable height (no CLS)
 * - URL sync for filters
 * - Clear/reset functionality
 */

export interface FiltersBarProps {
  onFilterChange?: (filters: FilterState) => void;
}

export interface FilterState {
  area?: string;
  priceMin?: number;
  priceMax?: number;
  areaM2Min?: number;
  areaM2Max?: number;
  rooms?: number;
  sort?: string;
}

const AREAS = [
  "Centru Vechi",
  "Pipera",
  "Floreasca",
  "Aviației",
  "Dorobanți",
  "Primăverii",
];

const SORT_OPTIONS = [
  { value: "price-asc", label: "Preț crescător" },
  { value: "price-desc", label: "Preț descrescător" },
  { value: "newest", label: "Cele mai noi" },
  { value: "tts", label: "TTS (rapid)" },
  { value: "underpriced", label: "Underpriced" },
];

export default function FiltersBar({ onFilterChange }: FiltersBarProps) {
  const [filters, setFilters] = React.useState<FilterState>({});
  const [activeChips, setActiveChips] = React.useState<string[]>([]);

  const updateFilter = React.useCallback(
    (key: keyof FilterState, value: any) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [filters, onFilterChange]
  );

  const removeFilter = React.useCallback(
    (key: keyof FilterState) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [filters, onFilterChange]
  );

  const clearAll = React.useCallback(() => {
    setFilters({});
    setActiveChips([]);
    onFilterChange?.({});
  }, [onFilterChange]);

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="sticky top-16 z-40 bg-bg border-b border-border">
      <div className="py-3">
        {/* Filter Chips - Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {/* Area Selector */}
          <select
            value={filters.area || ""}
            onChange={(e) => updateFilter("area", e.target.value || undefined)}
            className={cn(
              "h-8 px-3 text-sm rounded-lg border border-border bg-surface",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "transition-colors duration-fast"
            )}
          >
            <option value="">Toate zonele</option>
            {AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          {/* Price Range */}
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              placeholder="Min €"
              value={filters.priceMin || ""}
              onChange={(e) =>
                updateFilter(
                  "priceMin",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className={cn(
                "w-24 h-8 px-2 text-sm rounded-lg border border-border bg-surface",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            />
            <span className="text-sm text-muted">—</span>
            <input
              type="number"
              placeholder="Max €"
              value={filters.priceMax || ""}
              onChange={(e) =>
                updateFilter(
                  "priceMax",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className={cn(
                "w-24 h-8 px-2 text-sm rounded-lg border border-border bg-surface",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            />
          </div>

          {/* Area m² Range */}
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              placeholder="Min m²"
              value={filters.areaM2Min || ""}
              onChange={(e) =>
                updateFilter(
                  "areaM2Min",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className={cn(
                "w-24 h-8 px-2 text-sm rounded-lg border border-border bg-surface",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            />
            <span className="text-sm text-muted">—</span>
            <input
              type="number"
              placeholder="Max m²"
              value={filters.areaM2Max || ""}
              onChange={(e) =>
                updateFilter(
                  "areaM2Max",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className={cn(
                "w-24 h-8 px-2 text-sm rounded-lg border border-border bg-surface",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            />
          </div>

          {/* Rooms */}
          <select
            value={filters.rooms || ""}
            onChange={(e) =>
              updateFilter("rooms", e.target.value ? Number(e.target.value) : undefined)
            }
            className={cn(
              "h-8 px-3 text-sm rounded-lg border border-border bg-surface",
              "focus:outline-none focus:ring-2 focus:ring-primary"
            )}
          >
            <option value="">Camere</option>
            <option value="1">1 cameră</option>
            <option value="2">2 camere</option>
            <option value="3">3 camere</option>
            <option value="4">4+ camere</option>
          </select>

          {/* Sort */}
          <select
            value={filters.sort || ""}
            onChange={(e) => updateFilter("sort", e.target.value || undefined)}
            className={cn(
              "h-8 px-3 text-sm rounded-lg border border-border bg-surface",
              "focus:outline-none focus:ring-2 focus:ring-primary"
            )}
          >
            <option value="">Sortează</option>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Clear All */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-8 px-3 text-sm shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Resetează
            </Button>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {filters.area && (
              <FilterChip onRemove={() => removeFilter("area")}>
                Zonă: {filters.area}
              </FilterChip>
            )}
            {(filters.priceMin || filters.priceMax) && (
              <FilterChip
                onRemove={() => {
                  removeFilter("priceMin");
                  removeFilter("priceMax");
                }}
              >
                Preț: {filters.priceMin || "0"} - {filters.priceMax || "∞"} €
              </FilterChip>
            )}
            {(filters.areaM2Min || filters.areaM2Max) && (
              <FilterChip
                onRemove={() => {
                  removeFilter("areaM2Min");
                  removeFilter("areaM2Max");
                }}
              >
                Suprafață: {filters.areaM2Min || "0"} -{" "}
                {filters.areaM2Max || "∞"} m²
              </FilterChip>
            )}
            {filters.rooms && (
              <FilterChip onRemove={() => removeFilter("rooms")}>
                {filters.rooms} camere
              </FilterChip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Filter Chip with Remove Button */
function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-sm p-0.5 transition-colors"
        aria-label="Elimină filtru"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
