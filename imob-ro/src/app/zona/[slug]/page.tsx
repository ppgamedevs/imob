import type { Metadata } from "next";

import { jsonLdBreadcrumb, jsonLdZone } from "@/lib/seo/jsonld";
import { loadZone } from "@/lib/zones/load-zone";

import { ZoneClient } from "./ZoneClient";

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

// ISR: revalidate every 6 hours
export const revalidate = 21600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await loadZone(resolvedParams.slug);
  const name = data?.area?.name ?? resolvedParams.slug;
  const title = `Apartamente în ${name} – prețuri pe m², oferte și tendințe`;
  const desc = `Preț median pe m², oferte active, timp estimat de vânzare și tendințe pentru zona ${name}, București.`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/zona/${resolvedParams.slug}` },
    openGraph: {
      title,
      description: desc,
      url: `/zona/${resolvedParams.slug}`,
      images: [`/api/og/area?slug=${resolvedParams.slug}`], // Day 30: Dynamic OG image
    },
  };
}

export default async function ZonePage({ params }: Props) {
  const resolvedParams = await params;
  const data = await loadZone(resolvedParams.slug);

  if (!data) {
    return <div className="p-6">Zona nu a fost găsită.</div>;
  }

  const { area, kpi } = data;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLdZone({
              name: area.name,
              slug: area.slug,
              medianEurM2: kpi.pricePerSqm,
              supply: kpi.supply,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            jsonLdBreadcrumb([
              { name: "București", url: APP_URL },
              {
                name: `Zona ${area.name}`,
                url: `${APP_URL}/zona/${area.slug}`,
              },
            ]),
          ),
        }}
      />

      <h1 className="text-xl font-semibold">Zona {area.name}, București</h1>
      <p className="text-sm text-muted-foreground">
        Prețuri pe m², oferte active și tendințe actualizate.
      </p>

      <ZoneClient data={data} />
    </div>
  );
}
