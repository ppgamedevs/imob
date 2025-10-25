"use client";

import * as React from "react";
import { FilterPopover, FilterLabel } from "./FilterPopover";
import { ChevronDown } from "lucide-react";

export interface EurM2FilterProps {
  value: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number }) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function EurM2Filter({ value, onChange, count, countLoading }: EurM2FilterProps) {
  const [open, setOpen] = React.useState(false);
  const [localMin, setLocalMin] = React.useState(value.min?.toString() || '');
  const [localMax, setLocalMax] = React.useState(value.max?.toString() || '');

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

  const isActive = Boolean(value.min || value.max);
  const summary = isActive
    ? `${value.min || ''}–${value.max || ''} €/m²`
    : '€/m²';

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
          <FilterLabel htmlFor="eurm2-min">Min €/m²</FilterLabel>
          <input
            id="eurm2-min"
            type="number"
            min="0"
            step="100"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder="ex: 1200"
            className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <FilterLabel htmlFor="eurm2-max">Max €/m²</FilterLabel>
          <input
            id="eurm2-max"
            type="number"
            min="0"
            step="100"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder="ex: 2200"
            className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Range visualization */}
        {(localMin || localMax) && (
          <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
            <div className="text-xs text-muted mb-1">Interval selectat:</div>
            <div className="text-sm font-medium text-fg">
              {localMin || '0'} – {localMax || '∞'} €/m²
            </div>
          </div>
        )}
      </div>
    </FilterPopover>
  );
}
