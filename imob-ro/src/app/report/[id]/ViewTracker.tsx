"use client";

/**
 * ViewTracker - Client component to track property view events
 * Logs view event on mount and includes dwell tracking
 */

import { useEffect, useRef } from "react";
import { DwellTracker } from "@/components/DwellTracker";
import { trackPropertyView } from "./track.actions";

interface ViewTrackerProps {
  groupId: string | null;
  analysisId: string;
  areaSlug?: string | null;
  priceEur?: number | null;
  rooms?: number | null;
}

export function ViewTracker({ groupId, analysisId, areaSlug, priceEur, rooms }: ViewTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current || !groupId) return;
    trackedRef.current = true;

    // Track view event
    trackPropertyView({
      groupId,
      analysisId,
      areaSlug: areaSlug ?? undefined,
      priceEur: priceEur ?? undefined,
      rooms: rooms ?? undefined,
    }).catch((err) => {
      console.error("Failed to track property view:", err);
    });
  }, [groupId, analysisId, areaSlug, priceEur, rooms]);

  // Also include dwell tracker
  if (!groupId) return null;

  return (
    <DwellTracker
      groupId={groupId}
      analysisId={analysisId}
      meta={{
        areaSlug: areaSlug ?? undefined,
        priceEur: priceEur ?? undefined,
        rooms: rooms ?? undefined,
      }}
    />
  );
}
