"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface PaywallProps {
  children: ReactNode;
  locked: boolean;
  /** Number of visible lines before blur (for teaser) */
  teaserLines?: number;
}

/**
 * Wraps report sections. When locked=true, blurs the content and shows CTA.
 * Free users see full content for their first report, blurred for subsequent ones.
 */
export default function Paywall({ children, locked, teaserLines = 2 }: PaywallProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative">
      <div
        className="pointer-events-none select-none"
        style={{
          maxHeight: `${teaserLines * 2.5}rem`,
          overflow: "hidden",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/60 rounded-xl">
        <div className="text-center p-6">
          <div className="text-lg font-semibold mb-2">
            Continut disponibil cu abonament
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Deblocheaza raportul complet cu comparabile, argumente de negociere si estimari detaliate.
          </p>
          <Link
            href="/subscribe"
            className="inline-block rounded-xl px-6 py-2.5 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all"
          >
            Aboneaza-te - 9 EUR/luna
          </Link>
        </div>
      </div>
    </div>
  );
}
