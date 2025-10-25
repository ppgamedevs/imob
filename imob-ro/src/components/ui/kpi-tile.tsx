import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export interface KpiTileProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Label text (e.g., "Avg Price", "Total Units") */
  label: string;
  /** Main value (e.g., "€145,000", "234") */
  value: string | number;
  /** Delta change (optional, e.g., "+12%", "-5%") */
  delta?: string;
  /** Delta sentiment: positive (green), negative (red), neutral (default) */
  deltaVariant?: "positive" | "negative" | "neutral";
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * KpiTile - Display key performance indicators
 * 
 * Consistent component for showing metrics with icon, label, value, and optional delta.
 * Used across area pages, development pages, and dashboards.
 * 
 * @example
 * <KpiTile
 *   icon={TrendingUp}
 *   label="Avg Price/m²"
 *   value="€2,450"
 *   delta="+8.5%"
 *   deltaVariant="positive"
 * />
 */
export function KpiTile({
  icon: Icon,
  label,
  value,
  delta,
  deltaVariant = "neutral",
  size = "md",
  className,
  ...props
}: KpiTileProps) {
  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const valueSize = {
    sm: "text-lg font-semibold",
    md: "text-2xl font-bold",
    lg: "text-4xl font-bold",
  };

  const deltaColors = {
    positive: "text-[rgb(var(--success))]",
    negative: "text-[rgb(var(--danger))]",
    neutral: "text-[rgb(var(--muted))]",
  };

  return (
    <div
      className={cn(
        "bg-[rgb(var(--surface))] border border-[rgb(var(--border))]",
        "rounded-[var(--r-md)] shadow-[var(--elev1)]",
        "transition-[shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-smooth)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--elev2)]",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Label */}
          <p className="text-[var(--fs-sm)] text-[rgb(var(--muted))] font-medium mb-1">
            {label}
          </p>

          {/* Value */}
          <p className={cn("text-[rgb(var(--text))] tabular-nums", valueSize[size])}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>

          {/* Delta */}
          {delta && (
            <p className={cn("text-[var(--fs-sm)] font-medium mt-1", deltaColors[deltaVariant])}>
              {delta}
            </p>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className="w-5 h-5 text-[rgb(var(--primary))]" />
          </div>
        )}
      </div>
    </div>
  );
}
