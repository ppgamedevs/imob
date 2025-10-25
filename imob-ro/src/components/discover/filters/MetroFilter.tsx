"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { METRO_OPTIONS } from "@/lib/discover/filters";
import { cn } from "@/lib/utils";

import { FilterPopover } from "./FilterPopover";

export interface MetroFilterProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function MetroFilter({ value, onChange, count, countLoading }: MetroFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSelect = React.useCallback(
    (option: number | undefined) => {
      setLocalValue(option);
      onChange(option);
      setOpen(false);
    },
    [onChange],
  );

  const handleReset = React.useCallback(() => {
    setLocalValue(undefined);
    onChange(undefined);
  }, [onChange]);

  const isActive = value !== undefined;
  const summary = isActive ? `Max ${value}m metrou` : "Metrou";

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
      onReset={isActive ? handleReset : undefined}
      count={count}
      countLoading={countLoading}
      isActive={isActive}
    >
      <div className="space-y-2">
        <p className="text-xs text-muted mb-3">
          Distanța maximă față de cea mai apropiată stație de metrou
        </p>

        {METRO_OPTIONS.map((option, index) => (
          <label
            key={index}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-md cursor-pointer border transition-colors",
              localValue === option.value
                ? "bg-primary/5 border-primary"
                : "bg-surface border-border hover:bg-surface/50",
            )}
          >
            <input
              type="radio"
              name="metro"
              checked={localValue === option.value}
              onChange={() => handleSelect(option.value)}
              className="sr-only"
            />
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                localValue === option.value ? "border-primary" : "border-border",
              )}
            >
              {localValue === option.value && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <span className="text-sm text-fg">{option.label}</span>
          </label>
        ))}
      </div>
    </FilterPopover>
  );
}
