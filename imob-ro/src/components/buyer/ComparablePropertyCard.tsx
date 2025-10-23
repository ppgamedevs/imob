/**
 * Day 29: Comparable Property Card
 * Property card with selection for comparison (simplified version)
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WatchButton } from "./WatchButton";

type ComparablePropertyCardProps = {
  groupId: string;
  analysisId: string;
  photo: string | null;
  title: string;
  priceEur: number | null;
  eurM2: number | null;
  areaM2: number | null;
  rooms: number | null;
  areaSlug: string | null;
  priceBadge?: string | null;
  ttsBucket?: string | null;
  yieldNet?: number | null;
  selected?: boolean;
  onSelectionChange?: (groupId: string, selected: boolean) => void;
};

export function ComparablePropertyCard({
  groupId,
  analysisId,
  photo,
  title,
  priceEur,
  eurM2,
  areaM2,
  rooms,
  areaSlug,
  priceBadge,
  ttsBucket,
  yieldNet,
  selected = false,
  onSelectionChange,
}: ComparablePropertyCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow relative">
      {onSelectionChange && (
        <div className="absolute top-2 left-2 z-10">
          <Button
            size="sm"
            variant={selected ? "default" : "outline"}
            onClick={() => onSelectionChange(groupId, !selected)}
            className="h-8 w-8 p-0"
          >
            {selected ? "✓" : "+"}
          </Button>
        </div>
      )}

      <Link href={`/group/${groupId}`}>
        {photo && (
          <img
            src={photo}
            alt={title}
            className="w-full h-48 object-cover"
          />
        )}
      </Link>

      <CardContent className="p-4 space-y-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {priceBadge === "underpriced" && (
            <Badge variant="default">Underpriced</Badge>
          )}
          {ttsBucket === "fast" && (
            <Badge variant="secondary">Fast TTS</Badge>
          )}
          {yieldNet && yieldNet > 0.05 && (
            <Badge variant="outline">
              {(yieldNet * 100).toFixed(1)}% Yield
            </Badge>
          )}
        </div>

        <Link href={`/group/${groupId}`}>
          <p className="font-semibold text-lg hover:underline">
            {priceEur ? `${priceEur.toLocaleString()} €` : "Price N/A"}
          </p>
        </Link>

        {eurM2 && (
          <p className="text-sm text-muted-foreground">
            {eurM2.toLocaleString()} €/m²
          </p>
        )}

        <div className="text-sm text-muted-foreground">
          {rooms && `${rooms} rooms`}
          {rooms && areaM2 && " • "}
          {areaM2 && `${areaM2} m²`}
          {areaSlug && ` • ${areaSlug.replace(/-/g, " ")}`}
        </div>

        <p className="text-sm line-clamp-2">{title}</p>

        <div className="flex gap-2 pt-2">
          <WatchButton groupId={groupId} />
          <Link href={`/group/${groupId}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
