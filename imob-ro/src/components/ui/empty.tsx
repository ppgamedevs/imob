import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

export interface EmptyProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main headline */
  title: string;
  /** Helper text (1 line) */
  description?: string;
  /** Optional CTA button */
  action?: {
    label: string;
    onClick?: () => void;
    /** Optional link href (if provided, renders Link instead of button) */
    href?: string;
  };
  /** Additional class names */
  className?: string;
}

/**
 * Empty - Consistent empty state component
 *
 * Used when there's no data to display (empty search, no results, etc.)
 * Provides clear messaging and optional action button.
 *
 * @example
 * <Empty
 *   icon={Search}
 *   title="No results found"
 *   description="Try adjusting your filters"
 *   action={{ label: "Reset filters", onClick: () => resetFilters() }}
 * />
 */
export function Empty({ icon: Icon, title, description, action, className }: EmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "py-12 px-6 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div
        className="mb-4 w-16 h-16 rounded-full bg-[rgb(var(--surface-2))] 
                      flex items-center justify-center"
      >
        <Icon className="w-8 h-8 text-[rgb(var(--muted))]" />
      </div>

      {/* Title */}
      <h3 className="text-[var(--fs-lg)] font-semibold text-[rgb(var(--text))] mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-[var(--fs-sm)] text-[rgb(var(--muted))] mb-6 max-w-sm">{description}</p>
      )}

      {/* Action */}
      {action &&
        (action.href ? (
          <Button asChild variant="outline">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        ))}
    </div>
  );
}
