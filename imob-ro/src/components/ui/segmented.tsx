import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
}

/**
 * Segmented - iOS-style segmented control
 * 
 * Used for mutually exclusive options in a compact space.
 * Perfect for view toggles, sorting options, or filter groups.
 * 
 * @example
 * <Segmented
 *   options={[
 *     { value: "list", label: "List" },
 *     { value: "grid", label: "Grid" },
 *   ]}
 *   value={view}
 *   onChange={setView}
 * />
 */
export function Segmented({ options, value, onChange, size = "md", className, ...props }: SegmentedProps) {
  const sizeClasses = {
    sm: "h-8 text-[var(--fs-xs)]",
    md: "h-10 text-[var(--fs-sm)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center bg-[rgb(var(--surface-2))] rounded-[var(--r-sm)] p-1 gap-1",
        "border border-[rgb(var(--border))]",
        sizeClasses[size],
        className,
      )}
      role="tablist"
      {...props}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 rounded-[calc(var(--r-sm)-2px)]",
              "font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]",
              {
                "bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-sm": isActive,
                "text-[rgb(var(--muted))] hover:text-[rgb(var(--text))]": !isActive,
              },
            )}
          >
            {option.icon && <span className="w-4 h-4">{option.icon}</span>}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
