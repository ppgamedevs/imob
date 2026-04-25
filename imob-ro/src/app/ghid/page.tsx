import type { Metadata } from "next";
import Link from "next/link";

import { GuideCtaBlock } from "@/components/seo/GuideCtaBlock";
import { listBuyerGuides } from "@/lib/seo/buyer-guides";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Ghid cumpărător apartamente București",
  description:
    "Ghiduri pentru cine vrea să cumpere apartament: verificare, negociere, preț pe m², risc seismic, acte, verificare anunț. Pași concreți, fără promisiuni de evaluare oficială.",
  alternates: { canonical: `${base.replace(/\/$/, "")}/ghid` },
};

export default function GhidIndexPage() {
  const guides = listBuyerGuides();
  return (
    <article>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Ghid cumpărător: apartamente în București
      </h1>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Textele de mai jos te ajută să structurezi traseul, nu țin loc de consultanță juridică sau
        de expertiză tehnică. Când ești gata, lipeste un anunț în analiză și treci la verificări
        reale, cu notar, asociație și, dacă e cazul, specialiști.
      </p>
      <GuideCtaBlock />
      <h2 className="mt-10 text-lg font-semibold text-slate-900">Ghiduri disponibile</h2>
      <ul className="mt-4 space-y-3">
        {guides.map((g) => (
          <li
            key={g.slug}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
          >
            <Link
              href={`/ghid/${g.slug}`}
              className="text-base font-medium text-blue-600 hover:underline"
            >
              {g.title}
            </Link>
            <p className="mt-1 text-sm text-slate-600 line-clamp-2">{g.metaDescription}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
