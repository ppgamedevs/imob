"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function LlmEnrichTrigger({ analysisId }: { analysisId: string }) {
  const triggered = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!analysisId || triggered.current) return;
    triggered.current = true;

    let cancelled = false;

    async function triggerAndPoll() {
      try {
        await fetch(`/api/report/${analysisId}/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch { /* ignore trigger errors */ }

      let attempts = 0;
      const maxAttempts = 20;
      const interval = 3000;

      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, interval));
        if (cancelled) break;

        try {
          const res = await fetch(`/api/report/${analysisId}/enrich/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.done) {
              router.refresh();
              return;
            }
          }
        } catch { /* ignore poll errors */ }
      }

      // After max attempts, refresh anyway so the user sees the failed state
      if (!cancelled) router.refresh();
    }

    triggerAndPoll();

    return () => { cancelled = true; };
  }, [analysisId, router]);

  return null;
}
