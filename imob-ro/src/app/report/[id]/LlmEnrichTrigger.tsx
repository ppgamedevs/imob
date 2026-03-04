"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function LlmEnrichTrigger({ analysisId }: { analysisId: string }) {
  const triggered = useRef(false);
  const router = useRouter();
  const [showSkip, setShowSkip] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!analysisId || triggered.current) return;
    triggered.current = true;

    const skipTimer = setTimeout(() => setShowSkip(true), 10_000);

    async function triggerAndPoll() {
      try {
        await fetch(`/api/report/${analysisId}/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch { /* ignore trigger errors */ }

      let attempts = 0;
      const maxAttempts = 12;
      const interval = 3000;

      while (!cancelledRef.current && attempts < maxAttempts) {
        attempts++;
        await new Promise((r) => setTimeout(r, interval));
        if (cancelledRef.current) break;

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

      if (!cancelledRef.current) router.refresh();
    }

    triggerAndPoll();

    return () => {
      cancelledRef.current = true;
      clearTimeout(skipTimer);
    };
  }, [analysisId, router]);

  if (!showSkip) return null;

  return (
    <button
      onClick={() => {
        cancelledRef.current = true;
        router.refresh();
      }}
      className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
    >
      Analiza dureaza prea mult? Sari peste
    </button>
  );
}
