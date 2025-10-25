"use client";

import * as React from "react";
import { FilterPopover } from "./FilterPopover";
import { ChevronDown, Check } from "lucide-react";
import { SIGNALS } from "@/lib/discover/filters";
import { cn } from "@/lib/utils";

type SignalKey = 'underpriced' | 'fast_tts' | 'yield_high' | 'seismic_low';

export interface SignalsFilterProps {
  value: SignalKey[];
  onChange: (value: SignalKey[]) => void;
  count?: number | null;
  countLoading?: boolean;
}

export function SignalsFilter({ value, onChange, count, countLoading }: SignalsFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [localSelected, setLocalSelected] = React.useState<Set<SignalKey>>(new Set(value));

  React.useEffect(() => {
    setLocalSelected(new Set(value));
  }, [value]);

  const handleToggle = React.useCallback((signal: SignalKey) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(signal)) {
        next.delete(signal);
      } else {
        next.add(signal);
      }
      return next;
    });
  }, []);

  const handleApply = React.useCallback(() => {
    onChange(Array.from(localSelected) as SignalKey[]);
    setOpen(false);
  }, [localSelected, onChange]);

  const handleReset = React.useCallback(() => {
    setLocalSelected(new Set());
    onChange([]);
  }, [onChange]);

  const isActive = value.length > 0;
  const summary = isActive ? `${value.length} semnale` : 'Semnale';

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
      <div className="space-y-2">
        <p className="text-xs text-muted mb-3">
          Selectează oportunități speciale (poți alege mai multe)
        </p>

        {SIGNALS.map((signal) => {
          const isSelected = localSelected.has(signal.key);
          return (
            <label
              key={signal.key}
              className={cn(
                "flex items-start gap-3 p-3 rounded-md cursor-pointer border transition-colors",
                isSelected
                  ? "bg-primary/5 border-primary"
                  : "bg-surface border-border hover:bg-surface/50"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 flex items-center justify-center rounded border mt-0.5 transition-colors shrink-0",
                  isSelected
                    ? "bg-primary border-primary"
                    : "bg-bg border-border"
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-primary-fg" />}
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(signal.key)}
                className="sr-only"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg">{signal.label}</div>
                <div className="text-xs text-muted mt-0.5">{signal.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    </FilterPopover>
  );
}
