import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Surface - Base container primitive with elevation levels
 *
 * Provides consistent styling for cards, panels, and containers with:
 * - Elevation levels (0/1/2/3) for depth hierarchy
 * - Border and radius from design tokens
 * - Support for polymorphic rendering via asChild
 * - Smooth motion transitions
 */

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Elevation level affects shadow depth
   * - 0: minimal border only (subtle)
   * - 1: small shadow (cards, dropdowns)
   * - 2: medium shadow (popovers)
   * - 3: large shadow (modals, dialogs)
   */
  elevation?: 0 | 1 | 2 | 3;

  /**
   * If true, merges props into immediate child instead of rendering a div
   */
  asChild?: boolean;

  /**
   * Border radius from design tokens
   */
  rounded?: "sm" | "md" | "lg" | "xl";
}

const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, elevation = 1, asChild = false, rounded = "md", children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";

    const elevationStyles = {
      0: "shadow-[var(--elev0)]",
      1: "shadow-[var(--elev1)]",
      2: "shadow-[var(--elev2)]",
      3: "shadow-[var(--elev3)]",
    };

    const roundedStyles = {
      sm: "rounded-[var(--r-sm)]",
      md: "rounded-[var(--r-md)]",
      lg: "rounded-[var(--r-md)]", // Alias for backward compatibility
      xl: "rounded-[var(--r-xl)]",
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          // Base styles using tokens
          "bg-[rgb(var(--surface))] border border-[rgb(var(--border))]",
          // Elevation
          elevationStyles[elevation],
          // Radius
          roundedStyles[rounded],
          // Smooth motion transition
          "transition-[shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-smooth)]",
          // Hover lift effect
          "hover:-translate-y-0.5 hover:shadow-[var(--elev2)]",
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

Surface.displayName = "Surface";

export { Surface };
