"use client";

/**
 * DwellTracker - Client component to track dwell time on property pages
 *
 * Tracks time spent on page and sends event if user dwells >= 15 seconds
 * Uses navigator.sendBeacon for reliable non-blocking tracking
 */

import { useEffect, useRef } from "react";

interface DwellTrackerProps {
  groupId: string;
  analysisId: string;
  meta: {
    areaSlug?: string;
    priceEur?: number;
    rooms?: number;
    type?: string;
  };
}

export function DwellTracker({ groupId, analysisId, meta }: DwellTrackerProps) {
  const startTimeRef = useRef<number>(Date.now());
  const sentRef = useRef<boolean>(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    sentRef.current = false;

    const handleBeforeUnload = () => {
      if (sentRef.current) return;

      const dwellSeconds = (Date.now() - startTimeRef.current) / 1000;
      if (dwellSeconds >= 15) {
        // Send dwell event
        const payload = JSON.stringify({
          groupId,
          analysisId,
          dwellSeconds,
          meta,
        });

        // Use sendBeacon for reliable non-blocking tracking
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track/dwell", payload);
        } else {
          // Fallback to sync fetch
          fetch("/api/track/dwell", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {
            // Ignore errors
          });
        }

        sentRef.current = true;
      }
    };

    // Track on page unload
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also send on component unmount (navigation)
      handleBeforeUnload();
    };
  }, [groupId, analysisId, meta]);

  return null;
}
