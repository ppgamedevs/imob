"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";

import { BUCURESTI_AREAS } from "@/lib/discover/filters";
import { cn } from "@/lib/utils";

import { FilterLabel, FilterPopover } from "./FilterPopover";

export interface AreasFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function AreasFilter({ value, onChange, count, countLoading }: AreasFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [localSelected, setLocalSelected] = React.useState<Set<string>>(new Set(value));

  React.useEffect(() => {
    setLocalSelected(new Set(value));
  }, [value]);

  const filteredAreas = React.useMemo(() => {
    if (!search) return BUCURESTI_AREAS;
    const query = search.toLowerCase();
    return BUCURESTI_AREAS.filter(
      (area) => area.name.toLowerCase().includes(query) || area.slug.toLowerCase().includes(query),
    );
  }, [search]);

  const handleToggle = React.useCallback((slug: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const handleApply = React.useCallback(() => {
    onChange(Array.from(localSelected));
    setOpen(false);
  }, [localSelected, onChange]);

  const handleReset = React.useCallback(() => {
    setLocalSelected(new Set());
    onChange([]);
  }, [onChange]);

  const isActive = value.length > 0;
  const summary = isActive ? `${value.length} zone` : "Zone";

  return (
    <FilterPopover
      trigger={
        <>
          <span>{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </>
      }
      open={open}
      onOpenChange={setOpen}
      onApply={handleApply}
      onReset={isActive ? handleReset : undefined}
      count={count}
      countLoading={countLoading}
      isActive={isActive}
    >
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută zonă..."
            className="w-full h-9 pl-10 pr-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Checkboxes */}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filteredAreas.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted">Nicio zonă găsită</div>
          ) : (
            filteredAreas.map((area) => {
              const isSelected = localSelected.has(area.slug);
              return (
                <label
                  key={area.slug}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer",
                    "hover:bg-surface/50 transition-colors",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 flex items-center justify-center rounded border transition-colors",
                      isSelected ? "bg-primary border-primary" : "bg-bg border-border",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-fg" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(area.slug)}
                    className="sr-only"
                  />
                  <span className="text-sm text-fg">{area.name}</span>
                </label>
              );
            })
          )}
        </div>

        {/* Selected count */}
        {localSelected.size > 0 && (
          <div className="text-xs text-muted">{localSelected.size} zone selectate</div>
        )}
      </div>
    </FilterPopover>
  );
}
