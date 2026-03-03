"use client";

import { useEffect, useRef } from "react";

export function LlmEnrichTrigger({ analysisId }: { analysisId: string }) {
  const triggered = useRef(false);

  useEffect(() => {
    if (!analysisId || triggered.current) return;
    triggered.current = true;

    fetch(`/api/report/${analysisId}/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
  }, [analysisId]);

  return null;
}
