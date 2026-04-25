import type { Metadata } from "next";
import { type ReactNode } from "react";

import Link from "next/link";

import { listBuyerGuides } from "@/lib/seo/buyer-guides";

export const metadata: Metadata = {
  title: { default: "Ghid cumpărător", template: "%s | Ghid ImobIntel" },
  description:
    "Ghiduri practice pentru cumpărători: verificare apartament, negociere, preț pe m², risc seismic, acte, verificare anunț. Conținut informativ, nu consultanță juridică.",
};

export default function GhidLayout({ children }: { children: ReactNode }) {
  const guides = listBuyerGuides();
  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 text-sm text-muted-foreground">
          <Link href="/" className="text-blue-600 hover:underline">
            Acasă
          </Link>
          <span className="mx-2">/</span>
          <Link href="/ghid" className="text-blue-600 hover:underline">
            Ghid cumpărător
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-5">{children}</div>
      <div className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-3xl px-4 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Alte ghiduri</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/ghid/${g.slug}`} className="text-blue-600 hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
