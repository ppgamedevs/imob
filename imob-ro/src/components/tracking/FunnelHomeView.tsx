"use client";

import { useEffect, useRef } from "react";

import { postFunnelEvent } from "@/lib/tracking/funnel-client";

/** Once per home visit: `homepage_view`. */
export function FunnelHomeView() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    postFunnelEvent({ eventName: "homepage_view", path: "/" });
  }, []);
  return null;
}
