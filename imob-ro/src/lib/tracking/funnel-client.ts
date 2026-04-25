"use client";

import { redactSensitiveUrlParams } from "@/lib/url/sensitive-query";

const STORAGE_KEY = "imob_funnel_aid";

function ensureAnonymousId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export type FunnelClientPayload = {
  eventName: string;
  analysisId?: string;
  path?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort client funnel beacon; does not throw and never includes raw IPs (server may hash from headers).
 */
export function postFunnelEvent(payload: FunnelClientPayload): void {
  const anonymousId = ensureAnonymousId();
  const path = redactSensitiveUrlParams(
    payload.path ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
  );
  const rawRef = payload.referrer ?? (typeof document !== "undefined" ? document.referrer : undefined);
  const referrer =
    rawRef && rawRef.length > 0 ? redactSensitiveUrlParams(rawRef) : undefined;

  const body = JSON.stringify({
    eventName: payload.eventName,
    analysisId: payload.analysisId,
    anonymousId: anonymousId || undefined,
    path,
    referrer: referrer && referrer.length > 0 ? referrer : undefined,
    metadata: payload.metadata,
  });

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    const ok = navigator.sendBeacon("/api/track/funnel", blob);
    if (ok) return;
  }

  void fetch("/api/track/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
