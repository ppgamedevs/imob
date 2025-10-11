/**
 * Copilot: Build <ListingCard> with:
 * - image placeholder (16:9)
 * - title, price, m², rooms, neighborhood
 * - badges placeholder (Fair/Overpriced - to be wired later)
 * - skeleton state via className prop
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
      <Card className="overflow-hidden">
        <Skeleton className="aspect-video w-full" />
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const priceStatusConfig = {
    fair: { label: "Preț corect", variant: "default" as const },
    overpriced: { label: "Supraevaluat", variant: "destructive" as const },
    underpriced: { label: "Subevaluat", variant: "secondary" as const },
  };

  const statusInfo = listing.priceStatus ? priceStatusConfig[listing.priceStatus] : null;

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      {/* Image */}
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {listing.image ? (
          <img
            src={listing.image}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-muted-foreground">Fără imagine</span>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-lg font-semibold">{listing.title}</h3>
          {statusInfo && (
            <Badge variant={statusInfo.variant} className="shrink-0">
              {statusInfo.label}
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-primary">{listing.price.toLocaleString("ro-RO")} €</p>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{listing.area} m²</span>
          <span>•</span>
          <span>{listing.rooms} camere</span>
        </div>
      </CardContent>

      <CardFooter>
        <p className="text-sm text-muted-foreground">{listing.neighborhood}</p>
      </CardFooter>
    </Card>
  );
}
