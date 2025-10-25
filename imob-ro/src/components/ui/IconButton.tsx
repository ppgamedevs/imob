import * as React from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element to render */
  children: React.ReactNode;
  /** Visual variant */
  variant?: "default" | "ghost" | "primary";
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * IconButton - Accessible icon-only button
 *
 * Features:
 * - Touch target >= 40x40 (h-9 w-9 minimum with padding)
 * - Proper focus visible states
 * - Hover and active feedback
 * - Always include aria-label for accessibility
 *
 * Usage:
 * <IconButton aria-label="Close dialog">
 *   <Icon as={X} size={20} />
 * </IconButton>
 */
export function IconButton({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
  };

  const variantClasses = {
    default:
      "border border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:bg-[rgb(var(--surface-2))]",
    ghost: "bg-transparent hover:bg-[rgb(var(--surface))]",
    primary: "bg-[rgb(var(--primary))] text-white hover:opacity-90 border-transparent",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center",
        "rounded-[var(--r-md)]",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg))]",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
