"use client";

import * as React from "react";
import { FilterPopover, FilterLabel } from "./FilterPopover";
import { ChevronDown } from "lucide-react";
import { PRICE_PRESETS } from "@/lib/discover/filters";
import type { FilterState } from "@/lib/discover/filters";

export interface PriceFilterProps {
  value: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number }) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function PriceFilter({ value, onChange, count, countLoading }: PriceFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [localMin, setLocalMin] = React.useState(value.min?.toString() || '');
  const [localMax, setLocalMax] = React.useState(value.max?.toString() || '');

  // Sync local state when value changes externally
  React.useEffect(() => {
    setLocalMin(value.min?.toString() || '');
    setLocalMax(value.max?.toString() || '');
  }, [value.min, value.max]);

  const handleApply = React.useCallback(() => {
    const min = localMin ? Number(localMin) : undefined;
    const max = localMax ? Number(localMax) : undefined;
    onChange({ min, max });
    setOpen(false);
  }, [localMin, localMax, onChange]);

  const handleReset = React.useCallback(() => {
    setLocalMin('');
    setLocalMax('');
    onChange({ min: undefined, max: undefined });
  }, [onChange]);

  const handlePreset = React.useCallback((preset: number, type: 'min' | 'max') => {
    if (type === 'min') {
      setLocalMin(String(preset));
    } else {
      setLocalMax(String(preset));
    }
  }, []);

  const isActive = Boolean(value.min || value.max);
  const summary = isActive
    ? `${formatPrice(value.min)} – ${formatPrice(value.max)}`
    : 'Preț';

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
      <div className="space-y-4">
        <div>
          <FilterLabel htmlFor="price-min">Preț minim (€)</FilterLabel>
          <input
            id="price-min"
            type="number"
            min="0"
            step="1000"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder="ex: 50000"
            className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePreset(preset.value, 'min')}
                className="h-6 px-2 text-xs font-medium rounded border border-border bg-surface hover:bg-primary/5 hover:border-primary transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FilterLabel htmlFor="price-max">Preț maxim (€)</FilterLabel>
          <input
            id="price-max"
            type="number"
            min="0"
            step="1000"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder="ex: 150000"
            className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePreset(preset.value, 'max')}
                className="h-6 px-2 text-xs font-medium rounded border border-border bg-surface hover:bg-primary/5 hover:border-primary transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </FilterPopover>
  );
}

function formatPrice(value: number | undefined): string {
  if (!value) return '';
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return String(value);
}
