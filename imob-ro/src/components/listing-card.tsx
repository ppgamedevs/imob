/**
 * Copilot: Build <ListingCard> with:
 * - image placeholder (16:9)
 * - title, price, m², rooms, neighborhood
 * - badges placeholder (Fair/Overpriced - to be wired later)
 * - skeleton state via className prop
 */
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ListingCardProps {
  listing?: {
    id: string;
    title: string;
    price: number;
    area: number;
    rooms: number;
    neighborhood: string;
    image?: string;
    priceStatus?: "fair" | "overpriced" | "underpriced";
  };
  isLoading?: boolean;
}

export function ListingCard({ listing, isLoading }: ListingCardProps) {
  if (isLoading || !listing) {
    return (
      <div className="rounded-lg-2 overflow-hidden glass-card shadow-card-lg">
        <Skeleton className="aspect-video w-full" />
        <div className="p-4">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  const priceStatusConfig = {
    fair: { label: "Preț corect", variant: "default" as const },
    overpriced: { label: "Supraevaluat", variant: "destructive" as const },
    underpriced: { label: "Subevaluat", variant: "secondary" as const },
  };

  const statusInfo = listing.priceStatus ? priceStatusConfig[listing.priceStatus] : null;

  return (
    <article className="rounded-lg-2 overflow-hidden glass-card shadow-card-lg transition-transform hover:-translate-y-1">
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

        {/* overlay badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {statusInfo && (
            <Badge variant={statusInfo.variant} className="shrink-0">
              {statusInfo.label}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4">
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
      </div>
    </article>
  );
}
