"use client";

import Image from "next/image";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { SponsoredLabel } from "@/components/ui/SponsoredLabel";
import { cn } from "@/lib/utils";

/**
 * SponsoredCard - Listing card variant for sponsored/promoted content
 *
 * Features:
 * - Same layout as ListingCard for consistency
 * - Clear "Sponsored" badge
 * - Subtle border tint to differentiate from organic results
 * - Click tracking for sponsored impressions
 * - Never masquerades as organic content (WCAG-compliant)
 */

export interface SponsoredCardProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Sponsored listing data
   */
  listing: {
    id: string;
    title: string;
    price: number;
    area: number;
    rooms: number;
    neighborhood: string;
    image?: string;
    url?: string;
    sponsorId?: string;
  };

  /**
   * Position in feed (for tracking)
   */
  position?: number;
}

const SponsoredCard = React.forwardRef<HTMLElement, SponsoredCardProps>(
  ({ listing, position, className, ...props }, ref) => {
    const [hasTrackedImpression, setHasTrackedImpression] = React.useState(false);
    const cardRef = React.useRef<HTMLElement>(null);

    // Viewability tracking (50% visible for 1s)
    React.useEffect(() => {
      if (!cardRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !hasTrackedImpression) {
              setTimeout(() => {
                // Track sponsored impression
                fetch("/api/track/sponsored-impression", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    groupId: listing.id,
                    sponsorId: listing.sponsorId,
                    position,
                    timestamp: Date.now(),
                  }),
                }).catch(console.error);

                setHasTrackedImpression(true);
              }, 1000);
            }
          });
        },
        { threshold: 0.5 },
      );

      observer.observe(cardRef.current);

      return () => observer.disconnect();
    }, [hasTrackedImpression, listing.id, listing.sponsorId, position]);

    const handleClick = () => {
      // Track sponsored click
      fetch("/api/track/sponsored-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: listing.id,
          sponsorId: listing.sponsorId,
          position,
          url: listing.url,
          timestamp: Date.now(),
        }),
      }).catch(console.error);

      if (listing.url) {
        window.open(listing.url, "_blank", "noopener,noreferrer");
      }
    };

    return (
      <article
        ref={cardRef}
        className={cn(
          "rounded-lg-2 overflow-hidden glass-card shadow-card-lg",
          "transition-transform hover:-translate-y-1",
          // Subtle sponsored tint
          "border-2 border-adBorder",
          className,
        )}
        {...props}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {listing.image ? (
            <Image
              src={listing.image}
              alt={listing.title}
              width={1200}
              height={675}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-muted-foreground">Fără imagine</span>
            </div>
          )}

          {/* Sponsored badge overlay */}
          <div className="absolute top-3 left-3">
            <SponsoredLabel variant="sponsored" size="md" />
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="w-full p-4 text-left focus-ring cursor-pointer"
          aria-label={`Anunț sponsorizat: ${listing.title}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="line-clamp-1 text-lg font-semibold font-display">{listing.title}</h3>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-brand-600">
                {listing.price.toLocaleString("ro-RO")} €
              </div>
              <div className="text-xs text-muted-foreground">preț</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="font-medium">{listing.area} m²</div>
              <div className="text-muted-foreground">•</div>
              <div>{listing.rooms} camere</div>
            </div>
            <div className="text-sm text-muted-foreground">{listing.neighborhood}</div>
          </div>

          {/* Subtle disclaimer */}
          <div className="mt-2 text-xs text-adLabel">Conținut promovat</div>
        </button>
      </article>
    );
  },
);

SponsoredCard.displayName = "SponsoredCard";

export { SponsoredCard };
