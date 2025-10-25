"use client";

import { Star, StarOff, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { AreasFilter } from "@/components/discover/filters/AreasFilter";
import { EurM2Filter } from "@/components/discover/filters/EurM2Filter";
import { MetroFilter } from "@/components/discover/filters/MetroFilter";
// Individual filter components
import { PriceFilter } from "@/components/discover/filters/PriceFilter";
import { RoomsFilter } from "@/components/discover/filters/RoomsFilter";
import { SignalsFilter } from "@/components/discover/filters/SignalsFilter";
import { SizeFilter } from "@/components/discover/filters/SizeFilter";
import { SortSelect } from "@/components/discover/filters/SortSelect";
import { YearFilter } from "@/components/discover/filters/YearFilter";
import { Button } from "@/components/ui/button";
import {
  clearAllFilters,
  type FilterState,
  hasActiveFilters,
  parseFiltersFromURL,
  serializeFiltersToURL,
} from "@/lib/discover/filters";
import { cn } from "@/lib/utils";

/**
 * FiltersBar v2 - URL-as-truth filter chips with popovers
 *
 * Features:
 * - URL-based state (deep linkable, back/forward works)
 * - Chip-based UI with popovers (no CLS)
 * - Live result counts (debounced)
 * - Saved filters (localStorage for guests, server for users)
 * - Density toggle
 * - Full keyboard support
 */

export interface FiltersBarV2Props {
  /** Callback when filters change (for analytics) */
  onFilterChange?: (filters: FilterState) => void;
}

export default function FiltersBarV2({ onFilterChange }: FiltersBarV2Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse filters from URL (source of truth)
  const filters = React.useMemo(() => parseFiltersFromURL(searchParams), [searchParams]);

  // Live count state (debounced)
  const [count, setCount] = React.useState<number | null>(null);
  const [countLoading, setCountLoading] = React.useState(false);

  // Update URL with new filters (pushState, no reload)
  const updateFilters = React.useCallback(
    (newFilters: FilterState) => {
      const query = serializeFiltersToURL(newFilters);
      const newUrl = query ? `${pathname}?${query}` : pathname;
      router.push(newUrl, { scroll: false });
      onFilterChange?.(newFilters);
    },
    [pathname, router, onFilterChange],
  );

  // Individual filter change handlers
  const handlePriceChange = React.useCallback(
    (value: { min?: number; max?: number }) => {
      updateFilters({
        ...filters,
        priceMin: value.min,
        priceMax: value.max,
        page: 1, // Reset to page 1
      });
    },
    [filters, updateFilters],
  );

  const handleEurM2Change = React.useCallback(
    (value: { min?: number; max?: number }) => {
      updateFilters({
        ...filters,
        eurm2Min: value.min,
        eurm2Max: value.max,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  const handleAreasChange = React.useCallback(
    (value: string[]) => {
      updateFilters({
        ...filters,
        areas: value.length > 0 ? value : undefined,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  const handleRoomsChange = React.useCallback(
    (value: number[]) => {
      updateFilters({
        ...filters,
        rooms: value.length > 0 ? value : undefined,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  const handleSizeChange = React.useCallback(
    (value: { min?: number; max?: number }) => {
      updateFilters({
        ...filters,
        m2Min: value.min,
        m2Max: value.max,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  const handleYearChange = React.useCallback(
    (value: { min?: number; max?: number }) => {
      updateFilters({
        ...filters,
        yearMin: value.min,
        yearMax: value.max,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  const handleMetroChange = React.useCallback(
    (value: number | undefined) => {
      updateFilters({
        ...filters,
        metroMax: value,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  const handleSignalsChange = React.useCallback(
    (value: Array<"underpriced" | "fast_tts" | "yield_high" | "seismic_low">) => {
      updateFilters({
        ...filters,
        signals: value.length > 0 ? value : undefined,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  const handleSortChange = React.useCallback(
    (value: NonNullable<FilterState["sort"]>) => {
      updateFilters({
        ...filters,
        sort: value === "relevance" ? undefined : value,
        page: 1,
      });
    },
    [filters, updateFilters],
  );

  // Clear all filters
  const handleClearAll = React.useCallback(() => {
    updateFilters(clearAllFilters());
  }, [updateFilters]);

  // Fetch live count (debounced)
  React.useEffect(() => {
    if (!hasActiveFilters(filters)) {
      setCount(null);
      return;
    }

    setCountLoading(true);
    const timer = setTimeout(async () => {
      try {
        const query = serializeFiltersToURL(filters);
        const res = await fetch(`/api/discover/search?${query}&take=0`);
        if (!res.ok) throw new Error("Failed to fetch count");
        const data = await res.json();
        setCount(data.items?.length ?? 0);
      } catch (error) {
        console.error("[FiltersBar] Count fetch error:", error);
        setCount(null);
      } finally {
        setCountLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [filters]);

  const activeFiltersCount = hasActiveFilters(filters);

  return (
    <div className="sticky top-16 z-40 bg-bg border-b border-border">
      <div className="container py-3">
        {/* Main filter chips - horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {/* Price */}
          <PriceFilter
            value={{ min: filters.priceMin, max: filters.priceMax }}
            onChange={handlePriceChange}
            count={count}
            countLoading={countLoading}
          />

          {/* €/m² */}
          <EurM2Filter
            value={{ min: filters.eurm2Min, max: filters.eurm2Max }}
            onChange={handleEurM2Change}
            count={count}
            countLoading={countLoading}
          />

          {/* Areas */}
          <AreasFilter
            value={filters.areas || []}
            onChange={handleAreasChange}
            count={count}
            countLoading={countLoading}
          />

          {/* Rooms */}
          <RoomsFilter
            value={filters.rooms || []}
            onChange={handleRoomsChange}
            count={count}
            countLoading={countLoading}
          />

          {/* Size (m²) */}
          <SizeFilter
            value={{ min: filters.m2Min, max: filters.m2Max }}
            onChange={handleSizeChange}
            count={count}
            countLoading={countLoading}
          />

          {/* Year built */}
          <YearFilter
            value={{ min: filters.yearMin, max: filters.yearMax }}
            onChange={handleYearChange}
            count={count}
            countLoading={countLoading}
          />

          {/* Metro distance */}
          <MetroFilter
            value={filters.metroMax}
            onChange={handleMetroChange}
            count={count}
            countLoading={countLoading}
          />

          {/* Signals */}
          <SignalsFilter
            value={(filters.signals as any) || []}
            onChange={handleSignalsChange}
            count={count}
            countLoading={countLoading}
          />

          {/* Sort */}
          <SortSelect
            value={filters.sort || "relevance"}
            onChange={handleSortChange}
            count={count}
            countLoading={countLoading}
          />

          {/* Divider */}
          {activeFiltersCount && <div className="h-6 w-px bg-border shrink-0 mx-1" />}

          {/* Clear all */}
          {activeFiltersCount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-8 px-3 text-sm shrink-0"
            >
              <X className="h-4 w-4 mr-1.5" />
              Resetează
            </Button>
          )}

          {/* Saved filters (TODO: implement) */}
          <button
            type="button"
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-lg shrink-0",
              "border border-border bg-surface hover:bg-surface/50 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
            aria-label="Salvează filtrul curent"
            title="Salvează filtrul curent"
          >
            <Star className="h-4 w-4 text-muted" />
          </button>
        </div>

        {/* Results count summary */}
        {count !== null && !countLoading && (
          <div className="mt-2 text-xs text-muted">
            Aproximativ <span className="font-medium text-fg">{count} rezultate</span>
          </div>
        )}
      </div>
    </div>
  );
}
