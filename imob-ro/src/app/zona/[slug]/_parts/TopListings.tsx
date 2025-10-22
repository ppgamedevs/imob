import Image from "next/image";
import Link from "next/link";

interface ListingItem {
  id: string;
  title: string | null;
  priceEur: number | null;
  areaM2: number | null;
  photos: { src: string }[];
}

export function TopListings({ items }: { items: ListingItem[] }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">Nicio listare disponibilă.</div>;
  }

  const topItems = items.slice(0, 24);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {topItems.map((it) => {
        const ppSqm = it.priceEur && it.areaM2 ? Math.round(it.priceEur / it.areaM2) : null;
        const photoUrl = it.photos?.[0]?.src || null;

        return (
          <Link
            key={it.id}
            href={`/report/${it.id}`}
            className="block rounded-xl border p-2 hover:shadow transition"
          >
            {photoUrl && (
              <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                <Image
                  src={photoUrl}
                  alt={it.title || "Listare"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            )}
            <div className="mt-2 text-sm font-medium line-clamp-1">{it.title || "—"}</div>
            <div className="text-xs text-muted-foreground">
              {it.priceEur ? `€${it.priceEur.toLocaleString()}` : "—"}
              {ppSqm && <span className="ml-2">(€{ppSqm}/m²)</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
