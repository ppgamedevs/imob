"use client";

import * as React from "react";
import { FilterPopover } from "./FilterPopover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoomsFilterProps {
  value: number[];
  onChange: (value: number[]) => void;
  count?: number | null;
  countLoading?: boolean;
}

const ROOM_OPTIONS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' },
];

export function RoomsFilter({ value, onChange, count, countLoading }: RoomsFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [localSelected, setLocalSelected] = React.useState<Set<number>>(new Set(value));

  React.useEffect(() => {
    setLocalSelected(new Set(value));
  }, [value]);

  const handleToggle = React.useCallback((room: number) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(room)) {
        next.delete(room);
      } else {
        next.add(room);
      }
      return next;
    });
  }, []);

  const handleApply = React.useCallback(() => {
    onChange(Array.from(localSelected).sort((a, b) => a - b));
    setOpen(false);
  }, [localSelected, onChange]);

  const handleReset = React.useCallback(() => {
    setLocalSelected(new Set());
    onChange([]);
  }, [onChange]);

  const isActive = value.length > 0;
  const summary = isActive
    ? value.length === 1
      ? `${value[0]} camere`
      : `${value.length} opțiuni`
    : 'Camere';

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
        <p className="text-xs text-muted">
          Selectează numărul de camere (poți alege mai multe)
        </p>

        {/* Segmented buttons */}
        <div className="grid grid-cols-4 gap-2">
          {ROOM_OPTIONS.map((option) => {
            const isSelected = localSelected.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggle(option.value)}
                className={cn(
                  "h-12 flex items-center justify-center rounded-md text-sm font-medium",
                  "border transition-all duration-fast",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "bg-primary border-primary text-primary-fg"
                    : "bg-surface border-border text-fg hover:bg-surface/50"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </FilterPopover>
  );
}
