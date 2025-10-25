import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ListingSummary } from '@/lib/areas/dto';
import { formatNumber } from '@/lib/areas/series';

export interface BestNowProps {
  listings: ListingSummary[];
  areaName: string;
  slug: string;
}

export default function BestNow({ listings, areaName, slug }: BestNowProps) {
  if (listings.length === 0) {
    return (
      <div className="container py-8">
        <div className="rounded-lg border border-border bg-surface p-8">
          <div className="text-center text-muted">
            Niciun anunț disponibil în acest moment
          </div>
        </div>
      </div>
    );
  }

  const discoverUrl = `/discover?areas=${slug}&signals=underpriced`;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg mb-1">Cele mai bune oferte acum în {areaName}</h2>
          <p className="text-sm text-muted">
            Sortate după: Preț subapreciat → Randament ridicat → Vânzare rapidă
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={discoverUrl}>
            Vezi toate
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing, index) => (
          <ListingCardV3
            key={listing.id}
            listing={listing}
            priority={index < 3}
          />
        ))}
      </div>
    </div>
  );
}

// Simple listing card component
interface ListingCardV3Props {
  listing: ListingSummary;
  priority?: boolean;
}

function ListingCardV3({ listing, priority }: ListingCardV3Props) {
  const avmBadgeConfig = {
    under: { label: 'Subapreciat', variant: 'default' as const },
    fair: { label: 'Preț corect', variant: 'secondary' as const },
    over: { label: 'Supraevaluat', variant: 'destructive' as const },
  };

  const badgeInfo = listing.avmBadge ? avmBadgeConfig[listing.avmBadge] : null;

  return (
    <Link
      href={listing.href}
      className="block rounded-lg border border-border bg-surface overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-video w-full bg-muted">
        {listing.mediaUrl ? (
          <Image
            src={listing.mediaUrl}
            alt={listing.title}
            fill
            className="object-cover"
            loading={priority ? 'eager' : 'lazy'}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Star className="h-12 w-12" />
          </div>
        )}
        {/* Badge overlay */}
        {badgeInfo && (
          <div className="absolute top-2 left-2">
            <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="mb-2">
          <div className="text-2xl font-bold text-fg">
            {formatNumber(listing.priceEur)} €
          </div>
          <div className="text-sm text-muted">
            {formatNumber(listing.eurM2)} €/m²
          </div>
        </div>

        {/* Title */}
        <h3 className="font-medium text-fg mb-2 line-clamp-2">
          {listing.title}
        </h3>

        {/* Details */}
        <div className="flex items-center gap-4 text-sm text-muted mb-3">
          <span>{listing.rooms} camere</span>
          <span>{listing.areaM2} m²</span>
          {listing.floor && <span>Et. {listing.floor}</span>}
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-3 text-xs">
          {listing.yieldNet && (
            <div className="flex items-center gap-1">
              <span className="text-muted">Rand.:</span>
              <span className="font-medium text-fg">
                {(listing.yieldNet * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {listing.tts && (
            <div className="flex items-center gap-1">
              <span className="text-muted">TTS:</span>
              <span className="font-medium text-fg">{listing.tts}</span>
            </div>
          )}
          {listing.seismic && (
            <div className="flex items-center gap-1">
              <span className="text-muted">Seismic:</span>
              <span className="font-medium text-fg">{listing.seismic}</span>
            </div>
          )}
        </div>

        {/* Source */}
        {listing.sourceHost && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted">
            {listing.sourceHost}
          </div>
        )}
      </div>
    </Link>
  );
}
