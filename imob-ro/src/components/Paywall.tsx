"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface PaywallProps {
  children: ReactNode;
  locked: boolean;
  teaserLines?: number;
}

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
            Deblocheaza raportul complet cu comparabile avansate, scor detaliat, argumente de negociere si export PDF.
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-xl px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:brightness-110 transition-all"
          >
            Vezi planuri - de la 49 RON/luna
          </Link>
        </div>
      </div>
    </div>
  );
}
