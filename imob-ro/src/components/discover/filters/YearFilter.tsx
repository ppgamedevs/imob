"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { YEAR_RANGES } from "@/lib/discover/filters";
import { cn } from "@/lib/utils";

import { FilterLabel, FilterPopover } from "./FilterPopover";

export interface YearFilterProps {
  value: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number }) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function YearFilter({ value, onChange, count, countLoading }: YearFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"preset" | "custom">("preset");
  const [customMin, setCustomMin] = React.useState(value.min?.toString() || "");
  const [customMax, setCustomMax] = React.useState(value.max?.toString() || "");
  const [selectedPreset, setSelectedPreset] = React.useState<number>(-1);

  React.useEffect(() => {
    // Check if current value matches a preset
    const presetIndex = YEAR_RANGES.findIndex(
      (range) => range.min === value.min && range.max === value.max,
    );
    if (presetIndex !== -1) {
      setMode("preset");
      setSelectedPreset(presetIndex);
    } else if (value.min || value.max) {
      setMode("custom");
      setCustomMin(value.min?.toString() || "");
      setCustomMax(value.max?.toString() || "");
    }
  }, [value.min, value.max]);

  const handlePresetSelect = React.useCallback(
    (index: number) => {
      const range = YEAR_RANGES[index];
      setSelectedPreset(index);
      setMode("preset");
      onChange({ min: range.min, max: range.max });
    },
    [onChange],
  );

  const handleCustomApply = React.useCallback(() => {
    const min = customMin ? Number(customMin) : undefined;
    const max = customMax ? Number(customMax) : undefined;
    onChange({ min, max });
    setOpen(false);
  }, [customMin, customMax, onChange]);

  const handleReset = React.useCallback(() => {
    setCustomMin("");
    setCustomMax("");
    setSelectedPreset(-1);
    onChange({ min: undefined, max: undefined });
  }, [onChange]);

  const isActive = Boolean(value.min || value.max);
  const summary = isActive
    ? value.min && !value.max
      ? `din ${value.min}+`
      : value.min && value.max
        ? `${value.min}–${value.max}`
        : "An personalizat"
    : "An construcție";

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
      onApply={mode === "preset" ? () => setOpen(false) : handleCustomApply}
      onReset={isActive ? handleReset : undefined}
      count={count}
      countLoading={countLoading}
      isActive={isActive}
    >
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-surface rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setMode("preset")}
            className={cn(
              "flex-1 h-7 text-xs font-medium rounded transition-colors",
              mode === "preset" ? "bg-primary text-primary-fg" : "text-muted hover:text-fg",
            )}
          >
            Intervale predefinite
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={cn(
              "flex-1 h-7 text-xs font-medium rounded transition-colors",
              mode === "custom" ? "bg-primary text-primary-fg" : "text-muted hover:text-fg",
            )}
          >
            Custom
          </button>
        </div>

        {/* Preset ranges */}
        {mode === "preset" && (
          <div className="space-y-2">
            {YEAR_RANGES.map((range, index) => (
              <label
                key={index}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-md cursor-pointer border transition-colors",
                  selectedPreset === index
                    ? "bg-primary/5 border-primary"
                    : "bg-surface border-border hover:bg-surface/50",
                )}
              >
                <input
                  type="radio"
                  name="year-preset"
                  checked={selectedPreset === index}
                  onChange={() => handlePresetSelect(index)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedPreset === index ? "border-primary" : "border-border",
                  )}
                >
                  {selectedPreset === index && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <span className="text-sm text-fg">{range.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Custom inputs */}
        {mode === "custom" && (
          <div className="space-y-3">
            <div>
              <FilterLabel htmlFor="year-min">An minim</FilterLabel>
              <input
                id="year-min"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                placeholder="ex: 2010"
                className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <FilterLabel htmlFor="year-max">An maxim</FilterLabel>
              <input
                id="year-max"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                placeholder="ex: 2020"
                className="w-full h-9 px-3 text-sm rounded-md border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>
    </FilterPopover>
  );
}
