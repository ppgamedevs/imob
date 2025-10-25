"use client";

import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface NudgeProps {
  /** Unique key for localStorage (e.g. "discover-filters" */
  storageKey: string;
  /** Message to display */
  children: React.ReactNode;
  /** Position of the arrow pointer */
  position?: "top" | "bottom" | "left" | "right";
  /** Additional className */
  className?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

/**
 * Nudge - Lightweight onboarding bubble
 *
 * Features:
 * - Auto-hides after localStorage dismiss
 * - Respects prefers-reduced-motion
 * - Keyboard accessible (Escape to dismiss)
 * - Arrow pointer for visual context
 *
 * Usage:
 * <Nudge storageKey="discover-filters" position="bottom">
 *   Filtre rapide. Apasă pentru a seta bugete și zone
 * </Nudge>
 */
export function Nudge({
  storageKey,
  children,
  position = "bottom",
  className,
  onDismiss,
}: NudgeProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem(`nudge-dismissed-${storageKey}`);
    if (dismissed) {
      setIsVisible(false);
      return;
    }

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    // Show after a short delay (skip animation if reduced motion)
    const delay = mediaQuery.matches ? 0 : 800;
    const timer = setTimeout(() => setIsVisible(true), delay);

    return () => clearTimeout(timer);
  }, [storageKey]);

  const handleDismiss = React.useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(`nudge-dismissed-${storageKey}`, "true");
    onDismiss?.();
  }, [storageKey, onDismiss]);

  // Handle Escape key
  React.useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleDismiss]);

  if (!isVisible) return null;

  const arrowStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowPointer = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[rgb(var(--primary))] border-x-transparent border-x-8 border-t-8 border-b-0",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-[rgb(var(--primary))] border-x-transparent border-x-8 border-b-8 border-t-0",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[rgb(var(--primary))] border-y-transparent border-y-8 border-l-8 border-r-0",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-[rgb(var(--primary))] border-y-transparent border-y-8 border-r-8 border-l-0",
  };

  return (
    <div
      role="tooltip"
      aria-live="polite"
      className={cn("absolute z-50", arrowStyles[position], className)}
    >
      <div
        className={cn(
          "relative",
          "flex items-start gap-3",
          "max-w-xs p-3",
          "bg-[rgb(var(--primary))]",
          "text-white text-sm leading-relaxed",
          "rounded-[var(--r-md)]",
          "shadow-[var(--elev2)]",
          !prefersReducedMotion && "animate-in fade-in-0 zoom-in-95 duration-300",
        )}
      >
        {/* Arrow */}
        <div className={cn("absolute w-0 h-0", arrowPointer[position])} />

        {/* Content */}
        <div className="flex-1">{children}</div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "flex-shrink-0 p-0.5",
            "text-white/80",
            "hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
            "rounded-[var(--r-sm)]",
            "transition-colors duration-[var(--duration-fast)]",
          )}
          aria-label="Închide"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Check if a nudge has been dismissed
 */
export function isNudgeDismissed(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`nudge-dismissed-${storageKey}`) === "true";
}

/**
 * Reset a specific nudge (for testing)
 */
export function resetNudge(storageKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`nudge-dismissed-${storageKey}`);
}

/**
 * Reset all nudges (for testing)
 */
export function resetAllNudges(): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("nudge-dismissed-")) {
      localStorage.removeItem(key);
    }
  });
}
