import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Container - Responsive content container with max-width constraints
 *
 * Provides consistent horizontal spacing and max-width limits:
 * - Default: 1200px for most pages
 * - Wide: 1440px for discover/map views
 * - Full: 100% for custom layouts
 */

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Width variant
   * - "default": 1200px max-width
   * - "wide": 1440px max-width for discover/map
   * - "full": 100% width, no max constraint
   */
  width?: "default" | "wide" | "full";

  /**
   * Disable horizontal padding
   */
  noPadding?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, width = "default", noPadding = false, children, ...props }, ref) => {
    const widthStyles = {
      default: "max-w-[1200px]",
      wide: "max-w-[1440px]",
      full: "w-full",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto",
          widthStyles[width],
          !noPadding && "px-4 md:px-6 lg:px-8",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Container.displayName = "Container";

export { Container };
