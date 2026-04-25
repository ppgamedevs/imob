import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuideCtaBlock } from "@/components/seo/GuideCtaBlock";
import { getBuyerGuide, listBuyerGuides, BUYER_GUIDE_SLUGS } from "@/lib/seo/buyer-guides";
import { jsonLdArticleSeo, jsonLdBreadcrumb, jsonLdFaqPage } from "@/lib/seo/jsonld";

const base =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const appBase = base.replace(/\/$/, "");

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BUYER_GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = getBuyerGuide(slug);
  if (!g) {
    return { title: "Ghid" };
  }
  const url = `${appBase}/ghid/${g.slug}`;
  return {
    title: g.title,
    description: g.metaDescription,
    alternates: { canonical: `/ghid/${g.slug}` },
    openGraph: { title: g.title, description: g.metaDescription, url, type: "article" },
    twitter: { card: "summary_large_image", title: g.title, description: g.metaDescription },
  };
}

export default async function BuyerGuidePage({ params }: Props) {
  const { slug } = await params;
  const g = getBuyerGuide(slug);
  if (!g) notFound();

  const sameAs = listBuyerGuides().filter((x) => x.slug !== g.slug);
  const faqJson = g.faq.length > 0 ? jsonLdFaqPage(g.faq) : null;
  const articleJson = jsonLdArticleSeo({
    headline: g.title,
    description: g.metaDescription,
    path: `/ghid/${g.slug}`,
  });
  const breadcrumbJson = jsonLdBreadcrumb([
    { name: "Acasă", url: appBase },
    { name: "Ghid cumpărător", url: `${appBase}/ghid` },
    { name: g.title, url: `${appBase}/ghid/${g.slug}` },
  ]);

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }}
      />
      {faqJson && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      )}

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{g.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Actualizat periodic · conținut informativ</p>
      <p className="mt-4 text-base leading-relaxed text-slate-700">{g.intro}</p>

      <GuideCtaBlock />

      {g.sections.map((sec) => (
        <section key={sec.title} className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">{sec.title}</h2>
          {sec.paragraphs.map((p, idx) => (
            <p key={idx} className="mt-3 text-base leading-relaxed text-slate-700">
              {p}
            </p>
          ))}
          {sec.checklist && sec.checklist.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
                Checklist
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-800">
                {sec.checklist.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}

      {g.zoneLinks && g.zoneLinks.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Zone și prețuri</h2>
          <p className="mt-2 text-sm text-slate-600">
            Date agregate pe cartier, orientativ: pot exista abateri. Pagina de zonă nu înlocuiește
            o vizionare.
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm text-blue-600">
            {g.zoneLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {g.faq.length > 0 && (
        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-semibold text-slate-900">Întrebări frecvente</h2>
          <dl className="mt-4 space-y-4">
            {g.faq.map((item) => (
              <div key={item.question}>
                <dt className="font-medium text-slate-900">{item.question}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-10 rounded-lg border border-slate-200 bg-slate-100/50 p-4 text-xs text-slate-600">
        ImobIntel nu oferă consultanță juridică, expertiză ANEVAR sau concluzii oficiale asupra
        structurii. Folosește acest conținut alături de profesioniști acreditați.
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-900">Alte articole</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-blue-600">
          {sameAs.slice(0, 4).map((o) => (
            <li key={o.slug}>
              <Link href={`/ghid/${o.slug}`} className="hover:underline">
                {o.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
