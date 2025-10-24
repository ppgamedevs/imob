import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Surface - Base container primitive with elevation levels
 *
 * Provides consistent styling for cards, panels, and containers with:
 * - Elevation levels (0/1/2) for depth hierarchy
 * - Border and radius from design tokens
 * - Support for polymorphic rendering via asChild
 */

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Elevation level affects shadow depth
   * - 0: minimal border only (subtle)
   * - 1: small shadow (cards, dropdowns)
   * - 2: large shadow (modals, popovers)
   */
  elevation?: 0 | 1 | 2;

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
  ({ className, elevation = 0, asChild = false, rounded = "xl", children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";

    const elevationStyles = {
      0: "shadow-elev0",
      1: "shadow-elev1",
      2: "shadow-elev2",
    };

    const roundedStyles = {
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
    };

    return (
      <Comp
        ref={ref}
        className={cn(
          // Base styles
          "bg-surface border border-border",
          // Elevation
          elevationStyles[elevation],
          // Radius
          roundedStyles[rounded],
          // Motion (hover elevation increase)
          "transition-shadow duration-med ease-inout",
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
