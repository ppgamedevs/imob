"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FilterPopover - Base popover component for all filters
 *
 * Features:
 * - Portal mounting (no CLS)
 * - Focus trap & keyboard controls (Esc/Enter)
 * - Sticky footer with live count & actions
 * - Accessible (ARIA attributes)
 */

export interface FilterPopoverProps {
  /** Trigger button content */
  trigger: React.ReactNode;
  /** Popover content (form fields) */
  children: React.ReactNode;
  /** Live result count (optional) */
  count?: number | null;
  /** Loading state for count */
  countLoading?: boolean;
  /** Apply handler (called on Enter or Apply button) */
  onApply?: () => void;
  /** Reset handler (clears this filter) */
  onReset?: () => void;
  /** Open state (controlled) */
  open?: boolean;
  /** Open state change handler */
  onOpenChange?: (open: boolean) => void;
  /** Chip is active (has value) */
  isActive?: boolean;
}

export function FilterPopover({
  trigger,
  children,
  count,
  countLoading,
  onApply,
  onReset,
  open,
  onOpenChange,
  isActive,
}: FilterPopoverProps) {
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onApply?.();
      } else if (e.key === "Escape") {
        onOpenChange?.(false);
      }
    },
    [onApply, onOpenChange],
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg",
            "border transition-all duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
            "hover:bg-surface/50",
            isActive
              ? "border-primary bg-primary/5 text-primary"
              : "border-border bg-surface text-fg",
          )}
          aria-expanded={open}
        >
          {trigger}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          side="bottom"
          sideOffset={4}
          className={cn(
            "z-50 w-80 rounded-lg border border-border bg-surface shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2",
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Scrollable Content */}
          <div className="max-h-[60vh] overflow-y-auto p-4">{children}</div>

          {/* Footer with Count & Actions */}
          <div className="border-t border-border bg-surface/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-3">
            {/* Live Count */}
            <div className="text-xs text-muted min-w-0">
              {countLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="animate-spin w-3 h-3 border-2 border-muted border-t-transparent rounded-full" />
                  Numărare...
                </span>
              ) : count !== null && count !== undefined ? (
                <span>≈ {count} rezultate</span>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs font-medium text-muted hover:text-fg transition-colors"
                >
                  Resetează
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onApply?.();
                  onOpenChange?.(false);
                }}
                className={cn(
                  "h-7 px-3 text-xs font-medium rounded-md",
                  "bg-primary text-primary-fg hover:bg-primary/90",
                  "transition-colors",
                )}
              >
                Aplică
              </button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/**
 * FilterLabel - Accessible label for form fields
 */
export function FilterLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-fg mb-1.5">
      {children}
    </label>
  );
}

/**
 * FilterSection - Group related fields with optional heading
 */
export function FilterSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
      {children}
    </div>
  );
}
