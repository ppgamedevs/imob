"use client";

import * as React from "react";
import { FilterPopover } from "./FilterPopover";
import { ChevronDown } from "lucide-react";
import { SORT_OPTIONS, getSortLabel } from "@/lib/discover/filters";
import { cn } from "@/lib/utils";

type SortValue = 'relevance' | 'price_asc' | 'price_desc' | 'eurm2_asc' | 'eurm2_desc' | 'yield_desc' | 'tts_asc';

export interface SortSelectProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function SortSelect({ value, onChange, count, countLoading }: SortSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSelect = React.useCallback((option: SortValue) => {
    setLocalValue(option);
    onChange(option);
    setOpen(false);
  }, [onChange]);

  const isActive = value !== 'relevance';
  const summary = getSortLabel(value);

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
      onApply={() => setOpen(false)}
      count={count}
      countLoading={countLoading}
      isActive={isActive}
    >
      <div className="space-y-1">
        {SORT_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-md cursor-pointer border transition-colors",
              localValue === option.value
                ? "bg-primary/5 border-primary"
                : "bg-surface border-border hover:bg-surface/50"
            )}
          >
            <input
              type="radio"
              name="sort"
              checked={localValue === option.value}
              onChange={() => handleSelect(option.value)}
              className="sr-only"
            />
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                localValue === option.value
                  ? "border-primary"
                  : "border-border"
              )}
            >
              {localValue === option.value && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-sm text-fg">{option.label}</span>
          </label>
        ))}
      </div>
    </FilterPopover>
  );
}
