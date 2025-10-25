import { type LucideIcon } from "lucide-react";
import * as React from "react";

interface IconProps {
  /** Lucide icon component to render */
  as?: LucideIcon;
  /** Icon size in pixels (default: 18) */
  size?: number;
  /** Accessible title for screen readers */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Icon - Unified wrapper for lucide-react icons
 *
 * Features:
 * - Consistent sizing across the app (16/18/20/24)
 * - 1.5px stroke weight for readability
 * - Accessible with proper aria-label
 * - Inherits text color for semantic meaning
 *
 * Usage:
 * <Icon as={TrendingUp} size={20} title="Trending up" />
 */
export default function Icon({ as: Component, size = 18, title, className }: IconProps) {
  if (!Component) return null;

  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      className={`inline-flex items-center ${className || ""}`}
    >
      <Component
        width={size}
        height={size}
        strokeWidth={1.5}
        aria-hidden={title ? undefined : true}
      />
    </span>
  );
}
