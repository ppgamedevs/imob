"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { FilterLabel, FilterPopover } from "./FilterPopover";

export interface SizeFilterProps {
  value: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number }) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function SizeFilter({ value, onChange, count, countLoading }: SizeFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [localMin, setLocalMin] = React.useState(value.min?.toString() || "");
  const [localMax, setLocalMax] = React.useState(value.max?.toString() || "");

  React.useEffect(() => {
    setLocalMin(value.min?.toString() || "");
    setLocalMax(value.max?.toString() || "");
  }, [value.min, value.max]);

  const handleApply = React.useCallback(() => {
    const min = localMin ? Number(localMin) : undefined;
    const max = localMax ? Number(localMax) : undefined;
    onChange({ min, max });
    setOpen(false);
  }, [localMin, localMax, onChange]);

  const handleReset = React.useCallback(() => {
    setLocalMin("");
    setLocalMax("");
    onChange({ min: undefined, max: undefined });
  }, [onChange]);

  const isActive = Boolean(value.min || value.max);
  const summary = isActive ? `${value.min || ""}–${value.max || ""} m²` : "Suprafață";

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
          <FilterLabel htmlFor="m2-min">Suprafață minimă (m²)</FilterLabel>
          <input
            id="m2-min"
            type="number"
            min="0"
            step="10"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            placeholder="ex: 30"
            className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <FilterLabel htmlFor="m2-max">Suprafață maximă (m²)</FilterLabel>
          <input
            id="m2-max"
            type="number"
            min="0"
            step="10"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            placeholder="ex: 100"
            className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
    </FilterPopover>
  );
}
