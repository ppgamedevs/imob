import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export interface InlineStatProps extends ComponentPropsWithoutRef<"div"> {
  /** Label text */
  label: string;
  /** Value text or number */
  value: string | number;
  /** Variant for styling */
  variant?: "default" | "muted" | "success" | "warn" | "danger";
}

/**
 * InlineStat - Compact label/value pair
 * 
 * Micro-component for displaying inline statistics.
 * Perfect for dense layouts, table cells, or card footers.
 * 
 * @example
 * <InlineStat label="Units" value="24" />
 * <InlineStat label="Yield" value="5.2%" variant="success" />
 */
export function InlineStat({
  label,
  value,
  variant = "default",
  className,
  ...props
}: InlineStatProps) {
  const variantColors = {
    default: "text-[rgb(var(--text))]",
    muted: "text-[rgb(var(--muted))]",
    success: "text-[rgb(var(--success))]",
    warn: "text-[rgb(var(--warn))]",
    danger: "text-[rgb(var(--danger))]",
  };

  return (
    <div className={cn("inline-flex items-baseline gap-1.5", className)} {...props}>
      <span className="text-[var(--fs-sm)] text-[rgb(var(--muted))] font-medium">{label}:</span>
      <span className={cn("text-[var(--fs-sm)] font-semibold tabular-nums", variantColors[variant])}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
