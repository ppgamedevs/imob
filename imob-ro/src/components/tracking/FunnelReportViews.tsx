"use client";

import { useEffect, useRef } from "react";

import { postFunnelEvent } from "@/lib/tracking/funnel-client";

export function FunnelTrackReportPreview({ analysisId }: { analysisId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    postFunnelEvent({
      eventName: "report_preview_viewed",
      analysisId,
      path: typeof window !== "undefined" ? window.location.pathname : "/report",
    });
  }, [analysisId]);
  return null;
}

export function FunnelTrackPaidUnlockSuppressed({
  analysisId,
  sellability,
  active,
}: {
  analysisId: string;
  sellability: string;
  active: boolean;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (!active || sent.current) return;
    sent.current = true;
    postFunnelEvent({
      eventName: "report_paid_unlock_suppressed",
      analysisId,
      path: typeof window !== "undefined" ? window.location.pathname : "/report",
      metadata: { sellability },
    });
  }, [active, analysisId, sellability]);
  return null;
}

export function FunnelTrackReportUnlockedView({
  analysisId,
  active,
}: {
  analysisId: string;
  active: boolean;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (!active || sent.current) return;
    sent.current = true;
    postFunnelEvent({
      eventName: "report_unlocked_viewed",
      analysisId,
      path: typeof window !== "undefined" ? window.location.pathname : "/report",
    });
  }, [active, analysisId]);
  return null;
}
