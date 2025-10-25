"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { SponsoredLabel } from "../ui/SponsoredLabel";

/**
 * AdSlot - Static advertising slot component with zero CLS
 *
 * Features:
 * - Reserved height to prevent layout shift
 * - Viewability tracking via IntersectionObserver
 * - Click tracking with first-party endpoint
 * - WCAG-compliant labeling
 * - Responsive sizing
 */

export interface AdSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Unique identifier for tracking
   */
  id: string;

  /**
   * Position in the layout
   */
  position: "top" | "inline" | "sidebar" | "footer";

  /**
   * Ad size variant
   */
  size: "banner" | "rectangle" | "skyscraper";

  /**
   * Optional ad creative URL (when served)
   */
  adUrl?: string;

  /**
   * Optional click-through URL
   */
  clickUrl?: string;
}

const AD_SIZES = {
  banner: {
    desktop: { width: 728, height: 90 },
    mobile: { width: 320, height: 100 },
  },
  rectangle: {
    desktop: { width: 300, height: 250 },
    mobile: { width: 300, height: 250 },
  },
  skyscraper: {
    desktop: { width: 300, height: 600 },
    mobile: { width: 300, height: 250 }, // Fallback to rectangle on mobile
  },
};

const AdSlot = React.forwardRef<HTMLDivElement, AdSlotProps>(
  ({ id, position, size, adUrl, clickUrl, className, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [hasTrackedImpression, setHasTrackedImpression] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Viewability tracking (50% visible for 1s)
    React.useEffect(() => {
      if (!containerRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              setIsVisible(true);
            } else {
              setIsVisible(false);
            }
          });
        },
        { threshold: 0.5 },
      );

      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, []);

    // Track impression after 800ms of visibility (Step 12 spec)
    React.useEffect(() => {
      if (!isVisible || hasTrackedImpression) return;

      const timer = setTimeout(() => {
        // Track impression
        fetch("/api/track/ad-impression", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId: id,
            position,
            size,
            timestamp: Date.now(),
          }),
        }).catch(console.error);

        setHasTrackedImpression(true);
      }, 800); // 800ms dwell time

      return () => clearTimeout(timer);
    }, [isVisible, hasTrackedImpression, id, position, size]);

    const handleClick = () => {
      // Track click
      fetch("/api/track/ad-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: id,
          position,
          size,
          clickUrl,
          timestamp: Date.now(),
        }),
      }).catch(console.error);

      if (clickUrl) {
        window.open(clickUrl, "_blank", "noopener,noreferrer");
      }
    };

    const dimensions = AD_SIZES[size];
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const currentSize = isMobile ? dimensions.mobile : dimensions.desktop;

    return (
      <div
        ref={containerRef}
        className={cn(
          "flex items-center justify-center",
          "bg-[var(--ad-bg)] border border-[var(--ad-border)] rounded-[var(--r-md)] overflow-hidden",
          "transition-opacity duration-[var(--duration-base)]",
          className,
        )}
        style={{
          width: "100%",
          maxWidth: `${currentSize.width}px`,
          height: `${currentSize.height}px`,
          minHeight: `${currentSize.height}px`, // Prevent CLS - fixed height
        }}
        aria-label="Spațiu publicitar"
        role="complementary"
        {...props}
      >
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
          {/* Ad Label */}
          <div className="absolute top-2 left-2 z-10">
            <SponsoredLabel variant="ad" size="sm" />
          </div>

          {/* Ad Content or Placeholder */}
          {adUrl ? (
            <button
              type="button"
              onClick={handleClick}
              className="w-full h-full cursor-pointer focus-ring"
              aria-label="Deschide anunț publicitar"
            >
              <img
                src={adUrl}
                alt="Publicitate"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgb(var(--surface-2))] flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--ad-label)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-[var(--fs-xs)] text-[var(--ad-label)] font-medium">
                Spațiu rezervat publicitate
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
);

AdSlot.displayName = "AdSlot";

export { AdSlot };
