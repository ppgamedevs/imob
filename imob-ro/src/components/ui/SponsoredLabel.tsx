import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SponsoredLabel - Badge component for marking sponsored/ad content
 *
 * Provides clear, accessible labeling for paid content with:
 * - WCAG-compliant color contrast
 * - Semantic markup (aria-label)
 * - Consistent styling from design tokens
 */

export interface SponsoredLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Label text variant
   * - "sponsored": Default, user-friendly
   * - "ad": More explicit
   */
  variant?: "sponsored" | "ad";

  /**
   * Size variant
   */
  size?: "sm" | "md";
}

const SponsoredLabel = React.forwardRef<HTMLSpanElement, SponsoredLabelProps>(
  ({ className, variant = "sponsored", size = "sm", ...props }, ref) => {
    const sizeStyles = {
      sm: "text-xs px-2 py-0.5",
      md: "text-sm px-3 py-1",
    };

    const labelText = variant === "ad" ? "Publicitate" : "Sponsorizat";

    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center gap-1 font-medium rounded-sm",
          // Colors from tokens
          "bg-adBg text-adLabel border border-adBorder",
          // Size
          sizeStyles[size],
          // Accessibility
          "select-none",
          className,
        )}
        aria-label={`Conținut ${labelText.toLowerCase()}`}
        role="note"
        {...props}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {labelText}
      </span>
    );
  },
);

SponsoredLabel.displayName = "SponsoredLabel";

export { SponsoredLabel };
