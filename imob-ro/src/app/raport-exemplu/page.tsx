import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import {
  PUBLIC_SAMPLE_REPORT_ANALYSIS_ID,
} from "@/lib/report/sample-public-report";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "https://imobintel.ro";

export function generateMetadata(): Metadata {
  return {
    title: "Raport exemplu ImobIntel (demo)",
    description:
      "Demo: structură de raport complet, date demonstrative, fără plată. Conținutul live se deschide pe același raport de probă.",
    alternates: { canonical: "/raport-exemplu" },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Raport exemplu ImobIntel (date demonstrative)",
      description: "Demo — vezi aranjarea unui raport deblocat.",
      url: `${BASE.replace(/\/$/, "")}/raport-exemplu`,
      type: "article",
    },
  };
}

export default async function RaportExempluPage() {
  const row = await prisma.analysis.findUnique({
    where: { id: PUBLIC_SAMPLE_REPORT_ANALYSIS_ID },
    select: { id: true },
  });

  if (!row) {
    return (
      <div className="container mx-auto max-w-2xl py-16 px-4">
        <h1 className="text-2xl font-semibold tracking-tight">Raport exemplu</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Pentru a afișa raportul demonstrativ, baza de date trebuie să conțină analiza de probă.
          Pe mediu local, rulează:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">pnpm seed:demo</code>, apoi
          reîncarcă pagina. În producție, rulează o dată același seed (sau un script de migrare care
          inserează rândul).
        </p>
        <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
          Analizarea unui anunț real e un flux separat: nu completează rândul de probă de mai sus.
          Când acest ecran e gol, revino aici după ce datele de demo sunt pe server, sau trece
          direct la o analiză pe un anunț real.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-muted/60"
          >
            Pagina principală
          </Link>
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Analizează un anunț
          </Link>
        </div>
      </div>
    );
  }

  redirect(`/report/${PUBLIC_SAMPLE_REPORT_ANALYSIS_ID}?exemplu=1`);
}
