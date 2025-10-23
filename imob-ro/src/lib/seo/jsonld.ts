/**
 * JSON-LD schema generators for SEO.
 * Generates Place, AggregateOffer, and BreadcrumbList schemas.
 */

const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3000";

export function jsonLdZone({
  name,
  slug,
  medianEurM2,
  supply,
}: {
  name: string;
  slug: string;
  medianEurM2?: number | null;
  supply?: number | null;
}) {
  // Day 30: Calculate lowPrice/highPrice from median (±15%)
  const lowPrice = medianEurM2 ? Math.round(medianEurM2 * 0.85) : undefined;
  const highPrice = medianEurM2 ? Math.round(medianEurM2 * 1.15) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: `Zona ${name}, București`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "București",
      addressRegion: "RO",
    },
    url: `${APP_URL}/zona/${slug}`,
    aggregateOffer: {
      "@type": "AggregateOffer",
      offerCount: supply ?? undefined,
      lowPrice,
      highPrice,
      priceCurrency: "EUR",
    },
    additionalProperty: medianEurM2
      ? [
          {
            "@type": "PropertyValue",
            name: "Median €/m²",
            value: Math.round(medianEurM2),
          },
        ]
      : undefined,
  };
}

export function jsonLdBreadcrumb(list: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
