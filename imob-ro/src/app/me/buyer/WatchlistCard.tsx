/**
 * Day 29: Watchlist Card Component
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { removeWatchAction } from "./watch.actions";
import { useState } from "react";

type WatchlistCardProps = {
  item: {
    id: string;
    groupId: string;
    note: string | null;
    createdAt: Date;
    group: any;
  };
};

export function WatchlistCard({ item }: WatchlistCardProps) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeWatchAction(item.groupId);
    } catch (err) {
      console.error("Failed to remove:", err);
      setRemoving(false);
    }
  };

  const analysis = item.group?.canonicalAnalysis;
  const f = (analysis?.featureSnapshot?.features ?? {}) as any;
  const s = analysis?.scoreSnapshot as any;
  const photos = Array.isArray(analysis?.extractedListing?.photos)
    ? (analysis?.extractedListing?.photos as string[])
    : [];

  const priceEur = f?.priceEur ?? null;
  const areaM2 = f?.areaM2 ?? null;
  const eurM2 = priceEur && areaM2 ? Math.round(priceEur / areaM2) : null;

  // Check for price changes
  const snapshots = item.group?.snapshots ?? [];
  const hasPriceChange = snapshots.length >= 2 && snapshots[0]?.price !== snapshots[1]?.price;
  const priceDropped = hasPriceChange && snapshots[0]?.price < snapshots[1]?.price;

  return (
    <Card className="overflow-hidden">
      {photos[0] && (
        <img
          src={photos[0]}
          alt={analysis?.extractedListing?.title ?? "Property"}
          className="w-full h-40 object-cover"
        />
      )}
      <CardContent className="p-4 space-y-2">
        {priceDropped && (
          <Badge variant="default" className="mb-2">
            Price Dropped!
          </Badge>
        )}
        <Link href={`/group/${item.groupId}`}>
          <p className="font-semibold text-lg hover:underline">
            {priceEur ? `${priceEur.toLocaleString()} €` : "Price N/A"}
          </p>
        </Link>
        {eurM2 && (
          <p className="text-sm text-muted-foreground">
            {eurM2.toLocaleString()} €/m²
          </p>
        )}
        <p className="text-sm line-clamp-2">
          {analysis?.extractedListing?.title ?? "No title"}
        </p>
        {item.note && (
          <p className="text-xs text-muted-foreground italic">{item.note}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemove}
          disabled={removing}
          className="w-full"
        >
          {removing ? "Removing..." : "Remove from Watchlist"}
        </Button>
      </CardContent>
    </Card>
  );
}
